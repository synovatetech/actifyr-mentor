import { apiClient } from './client';
import type { ApiResponse } from '@/types';

export const supportService = {
    list: async (): Promise<ApiResponse<any>> => {
        return apiClient.get('/client/support-ticket/list');
    },

    get: async (id: string | number): Promise<ApiResponse<any>> => {
        return apiClient.get(`/client/support-ticket/${id}`);
    },

    respond: async (id: string | number, data: any): Promise<ApiResponse<any>> => {
        return apiClient.post(`/client/support-ticket/${id}/respond`, data);
    },
};
