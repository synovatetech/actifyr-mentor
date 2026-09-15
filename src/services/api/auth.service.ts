import { apiClient } from './client';
import { setToken, setRefreshToken, removeToken } from '@/lib/auth';
import type { ApiResponse } from '@/types';
import { useClientStore } from '@/store/clientStore';
import { useAuthStore } from '@/store/authStore';

export const authService = {
    login: async (credentials: any): Promise<ApiResponse<any>> => {
        const response = await apiClient.post<any>('/auth/unified-client/login', credentials);

        // Check for access_token in the response (as per user's curl response)
        if (response.success && response.data) {
            const newAccessToken = response.data.access_token || response.data?.data?.access_token;
            const newRefreshToken = response.data.refresh_token || response.data?.data?.refresh_token;

            if (newAccessToken) {
                setToken(newAccessToken);
            }
            if (newRefreshToken) {
                setRefreshToken(newRefreshToken);
            }
        }
        return response;
    },

    register: async (data: any): Promise<ApiResponse<any>> => {
        return apiClient.post('/client/register', data);
    },

    verifyOtp: async (data: { email: string; otp: string }): Promise<ApiResponse<any>> => {
        return apiClient.post('/client/verify-email', data);
    },

    resendOtp: async (data: { email: string }): Promise<ApiResponse<any>> => {
        return apiClient.post('/client/resend-otp', data);
    },

    requestPasswordReset: async (data: { email: string }): Promise<ApiResponse<any>> => {
        return apiClient.post('/auth/unified-client/request-password-reset', data);
    },

    resetPassword: async (data: { token: string; new_password: string }): Promise<ApiResponse<any>> => {
        return apiClient.post('/auth/unified-client/reset-password', data);
    },

    me: async (): Promise<ApiResponse<any>> => {
        return apiClient.get('/client/me');
    },

    uploadLogo: async (clientId: string | number, formData: FormData): Promise<ApiResponse<any>> => {
        return apiClient.post(`/client/${clientId}/logo`, formData);
    },

    updateProfile: async (formData: FormData): Promise<ApiResponse<any>> => {
        return apiClient.post('/client/me/update', formData);
    },

    updateProfileImage: async (formData: FormData): Promise<ApiResponse<any>> => {
        return apiClient.post('/client/me/profile-image', formData);
    },

    logout: () => {
        removeToken();
        useAuthStore.getState().logout();
        useClientStore.getState().reset();
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
    },
};
