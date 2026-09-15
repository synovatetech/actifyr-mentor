// ============================================
// API Client - Base HTTP Client
// ============================================

import { getToken, getRefreshToken, setToken, setRefreshToken, removeToken } from '@/lib/auth';
import { API_BASE_URL, API_TIMEOUT } from '@/constants';
import type { ApiResponse } from '@/types';
import NProgress from 'nprogress';
import { useLoaderStore } from '@/store/loaderStore';

let activeRequests = 0;

const startLoader = () => {
  if (typeof window !== 'undefined') {
    if (activeRequests === 0) {
      NProgress.start();
    }
    useLoaderStore.getState().showLoader();
    activeRequests++;
  }
};

const stopLoader = () => {
  if (typeof window !== 'undefined') {
    activeRequests = Math.max(0, activeRequests - 1);
    if (activeRequests === 0) {
      NProgress.done();
    }
    useLoaderStore.getState().hideLoader();
  }
};

interface RequestConfig extends RequestInit {
  timeout?: number;
  skipLoader?: boolean;
}

class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;

  constructor(baseUrl: string = API_BASE_URL, timeout: number = API_TIMEOUT) {
    this.baseUrl = baseUrl;
    this.defaultTimeout = timeout;
  }

  private parseErrorMessage(body: unknown, status: number): string {
    if (Array.isArray(body) && body.length > 0 && body[0]?.message) {
      return body[0].message;
    }
    if (body && typeof body === 'object') {
      const obj = body as Record<string, any>;
      if (obj.message) return obj.message;
      if (obj.error && typeof obj.error === 'string') return obj.error;
      if (Array.isArray(obj.errors) && obj.errors[0]?.message) {
        return obj.errors[0].message;
      }
      // FastAPI-style `{ detail: ... }` — either a plain string, or a structured
      // `{ message, errors: [{ row, column, message }] }` (e.g. CSV import validation).
      if (obj.detail) {
        if (typeof obj.detail === 'string') return obj.detail;
        if (typeof obj.detail === 'object') {
          const detail = obj.detail as Record<string, any>;
          if (Array.isArray(detail.errors) && detail.errors.length > 0) {
            const first = detail.errors[0];
            const rowPart = first?.row != null ? `Row ${first.row}: ` : '';
            const more = detail.errors.length > 1 ? ` (+${detail.errors.length - 1} more)` : '';
            return `${detail.message ? `${detail.message} ` : ''}${rowPart}${first?.message || ''}${more}`.trim();
          }
          if (detail.message) return detail.message;
        }
      }
    }
    if (typeof body === 'string' && body.trim()) return body;
    return `Something went wrong. Please try again.`;
  }

  private async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const { timeout = this.defaultTimeout, ...fetchConfig } = config;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const token = getToken();
    const headers: Record<string, string> = {
      ...(config.headers as Record<string, string>),
    };

    const isAuthEndpoint = endpoint.includes('/auth/unified-client/login');

    if (token && !headers['Authorization'] && !isAuthEndpoint) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!config.skipLoader) {
      startLoader();
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...fetchConfig,
        signal: controller.signal,
        headers,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 502 && typeof window !== 'undefined') {
          if (!window.location.pathname.startsWith('/maintenance')) {
            const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
            const maintenanceUrl = `/maintenance?returnTo=${encodeURIComponent(returnTo)}`;
            window.location.href = maintenanceUrl;
          }
        }

        const isPublicEndpoint =
          endpoint.includes('/auth/') ||
          endpoint.includes('/client/register') ||
          endpoint.includes('/client/verify-email');

        if (response.status === 401 && !isPublicEndpoint) {
          const refreshToken = getRefreshToken();
          if (refreshToken) {
            try {
              const refreshRes = await fetch(`${this.baseUrl}/auth/unified-client/refresh`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ refresh_token: refreshToken })
              });

              if (refreshRes.ok) {
                const refreshData = await refreshRes.json();
                const newAccessToken = refreshData.access_token || refreshData?.data?.access_token;
                const newRefreshToken = refreshData.refresh_token || refreshData?.data?.refresh_token;

                if (newAccessToken) {
                  setToken(newAccessToken);
                  if (newRefreshToken) {
                    setRefreshToken(newRefreshToken);
                  }

                  const newHeaders = {
                    ...headers,
                    'Authorization': `Bearer ${newAccessToken}`
                  };

                  const retryRes = await fetch(`${this.baseUrl}${endpoint}`, {
                    ...fetchConfig,
                    headers: newHeaders,
                  });

                  if (retryRes.ok) {
                    const data = await retryRes.json();
                    return { success: true, data };
                  }
                }
              }
            } catch (refreshErr) {
              console.error('Failed to refresh token:', refreshErr);
            }
          }

          if (typeof window !== 'undefined') {
            removeToken();
            window.location.href = '/login';
          }
        }

        let errorBody: unknown = null;
        try {
          errorBody = await response.json();
        } catch {
          // Response wasn't JSON — errorBody stays null
        }

        if (response.status === 403) {
          const errorCode = (errorBody as any)?.errors?.[0]?.code;
          if (errorCode === 'G2P-AUT-403' && typeof window !== 'undefined') {
            removeToken();
            window.location.href = '/login';
          }
        }

        throw new Error(this.parseErrorMessage(errorBody, response.status));
      }

      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      await new Promise(r => setTimeout(r, 500));
      return { success: true, data };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        await new Promise(r => setTimeout(r, 500));
        return {
          success: false,
          data: null as T,
          error: error.message,
        };
      }

      await new Promise(r => setTimeout(r, 500));
      return {
        success: false,
        data: null as T,
        error: 'An unexpected error occurred',
      };
    } finally {
      if (!config.skipLoader) {
        stopLoader();
      }
    }
  }

  async get<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T>(
    endpoint: string,
    body?: unknown,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const isFormData = body instanceof FormData;
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: isFormData ? (body as FormData) : (body ? JSON.stringify(body) : undefined),
      headers: isFormData
        ? { ...config?.headers }
        : { 'Content-Type': 'application/json', ...config?.headers },
    });
  }

  async put<T>(
    endpoint: string,
    body?: unknown,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const isFormData = body instanceof FormData;
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: isFormData ? (body as FormData) : (body ? JSON.stringify(body) : undefined),
      headers: isFormData
        ? { ...config?.headers }
        : { 'Content-Type': 'application/json', ...config?.headers },
    });
  }

  async patch<T>(
    endpoint: string,
    body?: unknown,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const isFormData = body instanceof FormData;
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: isFormData ? (body as FormData) : (body ? JSON.stringify(body) : undefined),
      headers: isFormData
        ? { ...config?.headers }
        : { 'Content-Type': 'application/json', ...config?.headers },
    });
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
export default ApiClient;
