import { apiClient } from './client';
import type { ApiResponse } from '@/types';

export const workbookService = {
    create: async (data: FormData): Promise<ApiResponse<any>> => {
        return apiClient.post('/client/workbook/create', data);
    },

    list: async (programId: string | number): Promise<ApiResponse<any[]>> => {
        const response = await apiClient.get<any>(`/client/workbook/list/${programId}`);
        if (response.success && response.data) {
            const data = response.data.workbooks || response.data;
            return { ...response, data: Array.isArray(data) ? data : [] };
        }
        return response;
    },

    get: async (id: string | number): Promise<ApiResponse<any>> => {
        const response = await apiClient.get<any>(`/client/workbook/${id}`);
        if (response.success && response.data) {
            const data = response.data.workbook || response.data;
            return { ...response, data };
        }
        return response;
    },

    update: async (id: string | number, data: FormData): Promise<ApiResponse<any>> => {
        return apiClient.put(`/client/workbook/${id}`, data);
    },

    delete: async (id: string | number): Promise<ApiResponse<any>> => {
        return apiClient.delete(`/client/workbook/${id}`);
    },
};
