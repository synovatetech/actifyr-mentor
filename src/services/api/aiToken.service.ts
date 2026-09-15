import { apiClient } from "./client";
import type { ApiResponse } from "@/types";
import { API_BASE_URL } from "@/constants";
import { getToken } from "@/lib/auth";

export interface AiTokenPricing {
  price_per_token: number;
  gst_rate: number;
  currency: string;
}

export interface AiTokenBalance {
  client_id: number;
  total_tokens: number;
  used_tokens: number;
  available_tokens: number;
}

export interface AiTokenOrderPayload {
  token_quantity: number;
  billing_name: string;
  billing_email: string;
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_pincode: string;
  billing_country: string;
  gst_number?: string;
}

export interface AiTokenOrderResponse {
  purchase_id: number;
  purchase_ref_code: string;
  token_quantity: number;
  price_per_token: number;
  subtotal: number;
  gst_rate: number;
  gst_amount: number;
  total_amount: number;
  razorpay_order_id: string;
  razorpay_amount: number;
  razorpay_currency: string;
  razorpay_key_id: string;
  billing_name: string;
  billing_email: string;
}

export interface AiTokenVerifyPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface AiTokenPurchase {
  id: number;
  purchase_ref_code: string;
  client_id: number;
  token_quantity: number;
  price_per_token: number;
  subtotal: number;
  gst_rate: number;
  gst_amount: number;
  total_amount: number;
  status: string;
  billing_name: string;
  billing_email: string;
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_pincode: string;
  billing_country: string;
  gst_number: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  created_at: string;
}

export interface AiTokenPurchasesResponse {
  purchases: AiTokenPurchase[];
  total: number;
  page: number;
  page_size: number;
}

const unwrapData = <T>(payload: unknown): T => {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    (payload as { data?: T }).data
  ) {
    return (payload as { data: T }).data;
  }
  return payload as T;
};

export const aiTokenService = {
  pricing: async (): Promise<ApiResponse<AiTokenPricing>> => {
    const response = await apiClient.get<AiTokenPricing>("/client/ai-token/pricing");
    if (!response.success) {
      return response;
    }

    return {
      ...response,
      data: unwrapData<AiTokenPricing>(response.data),
    };
  },

  balance: async (): Promise<ApiResponse<AiTokenBalance>> => {
    const response = await apiClient.get<AiTokenBalance>("/client/ai-token/balance");
    if (!response.success) {
      return response;
    }

    return {
      ...response,
      data: unwrapData<AiTokenBalance>(response.data),
    };
  },

  createOrder: async (
    payload: AiTokenOrderPayload,
  ): Promise<ApiResponse<AiTokenOrderResponse>> => {
    const response = await apiClient.post<AiTokenOrderResponse>(
      "/client/ai-token/order",
      payload,
    );
    if (!response.success) {
      return response;
    }

    return {
      ...response,
      data: unwrapData<AiTokenOrderResponse>(response.data),
    };
  },

  verifyOrder: async (
    payload: AiTokenVerifyPayload,
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.post<Record<string, unknown>>(
      "/client/ai-token/order/verify",
      payload,
    );
  },

  purchases: async (
    page = 1,
    pageSize = 20,
  ): Promise<ApiResponse<AiTokenPurchasesResponse>> => {
    const response = await apiClient.get<AiTokenPurchasesResponse>(
      `/client/ai-token/purchases?page=${page}&page_size=${pageSize}`,
    );
    if (!response.success) {
      return response;
    }

    return {
      ...response,
      data: unwrapData<AiTokenPurchasesResponse>(response.data),
    };
  },

  getInvoiceBlob: async (id: string | number): Promise<Blob> => {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/client/ai-token/invoice/${id}`, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch invoice: ${response.status}`);
    }

    return response.blob();
  },
};
