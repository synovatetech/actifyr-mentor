import { apiClient } from './client';
import type { ApiResponse } from '@/types';
import { API_BASE_URL } from '@/constants';
import { getToken } from '@/lib/auth';

export const licenseService = {
    list: async (): Promise<ApiResponse<any>> => {
        return apiClient.get('/client/license-plan/list');
    },

    details: async (): Promise<ApiResponse<any>> => {
        return apiClient.get('/client/license-plan/details');
    },

    createOrder: async (data: any): Promise<ApiResponse<any>> => {
        return apiClient.post('/client/license-plan/order', data);
    },

    verifyPayment: async (data: any): Promise<ApiResponse<any>> => {
        return apiClient.post('/client/license-plan/order/verify', data);
    },

    inviteParticipant: async (data: any): Promise<ApiResponse<any>> => {
        return apiClient.post('/client/license/invite-participant', data);
    },

    deleteInvite: async (id: string | number): Promise<ApiResponse<any>> => {
        return apiClient.put(`/client/license/${id}/delete-invite`);
    },

    removeUser: async (id: string | number): Promise<ApiResponse<any>> => {
        return apiClient.put(`/client/license/${id}/remove-user`);
    },

    getInvoiceBlob: async (id: string | number): Promise<Blob> => {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/client/license-plan/invoice/${id}`, {
            method: 'GET',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch invoice: ${response.status}`);
        }

        return response.blob();
    },
};
