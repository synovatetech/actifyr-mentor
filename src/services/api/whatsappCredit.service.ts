import { apiClient } from "./client";
import type { ApiResponse } from "@/types";
import { API_BASE_URL } from "@/constants";
import { getToken } from "@/lib/auth";

export interface WhatsappCreditPricing {
  price_per_credit: number;
  gst_rate: number;
  currency: string;
}

export interface WhatsappCreditBalance {
  client_id: number;
  total_credits: number;
  used_credits: number;
  available_credits: number;
}

export interface WhatsappCreditOrderPayload {
  credit_quantity: number;
  billing_name: string;
  billing_email: string;
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_pincode: string;
  billing_country: string;
  gst_number?: string;
}

export interface WhatsappCreditOrderResponse {
  purchase_id: number;
  purchase_ref_code: string;
  credit_quantity: number;
  price_per_credit: number;
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

export interface WhatsappCreditVerifyPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface WhatsappCreditPurchase {
  id: number;
  purchase_ref_code: string;
  client_id: number;
  credit_quantity: number;
  price_per_credit: number;
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

export interface WhatsappCreditPurchasesResponse {
  purchases: WhatsappCreditPurchase[];
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

export const whatsappCreditService = {
  pricing: async (): Promise<ApiResponse<WhatsappCreditPricing>> => {
    const response = await apiClient.get<WhatsappCreditPricing>(
      "/client/whatsapp-credit/pricing",
    );
    if (!response.success) {
      return response;
    }

    return {
      ...response,
      data: unwrapData<WhatsappCreditPricing>(response.data),
    };
  },

  balance: async (): Promise<ApiResponse<WhatsappCreditBalance>> => {
    const response = await apiClient.get<WhatsappCreditBalance>(
      "/client/whatsapp-credit/balance",
    );
    if (!response.success) {
      return response;
    }

    return {
      ...response,
      data: unwrapData<WhatsappCreditBalance>(response.data),
    };
  },

  createOrder: async (
    payload: WhatsappCreditOrderPayload,
  ): Promise<ApiResponse<WhatsappCreditOrderResponse>> => {
    const response = await apiClient.post<WhatsappCreditOrderResponse>(
      "/client/whatsapp-credit/order",
      payload,
    );
    if (!response.success) {
      return response;
    }

    return {
      ...response,
      data: unwrapData<WhatsappCreditOrderResponse>(response.data),
    };
  },

  verifyOrder: async (
    payload: WhatsappCreditVerifyPayload,
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.post<Record<string, unknown>>(
      "/client/whatsapp-credit/order/verify",
      payload,
    );
  },

  purchases: async (
    page = 1,
    pageSize = 20,
  ): Promise<ApiResponse<WhatsappCreditPurchasesResponse>> => {
    const response = await apiClient.get<WhatsappCreditPurchasesResponse>(
      `/client/whatsapp-credit/purchases?page=${page}&page_size=${pageSize}`,
    );
    if (!response.success) {
      return response;
    }

    return {
      ...response,
      data: unwrapData<WhatsappCreditPurchasesResponse>(response.data),
    };
  },

  getInvoiceBlob: async (id: string | number): Promise<Blob> => {
    const token = getToken();
    const response = await fetch(
      `${API_BASE_URL}/client/whatsapp-credit/invoice/${id}`,
      {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch invoice: ${response.status}`);
    }

    return response.blob();
  },
};
