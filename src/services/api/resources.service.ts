import { apiClient } from './client';
import type { ApiResponse } from '@/types';

export const resourcesService = {
    create: async (data: FormData): Promise<ApiResponse<any>> => {
        return apiClient.post('/client/resource/create', data);
    },

    list: async (programId: string | number): Promise<ApiResponse<any>> => {
        const response = await apiClient.get<any>(`/client/resource/list/${programId}`);
        if (response.success && response.data) {
            const data = response.data.resources || response.data.data || response.data;
            return { ...response, data: Array.isArray(data) ? data : [] };
        }
        return response;
    },

    get: async (id: string | number): Promise<ApiResponse<any>> => {
        const response = await apiClient.get<any>(`/client/resource/${id}`);
        if (response.success && response.data) {
            const data = response.data.resource || response.data;
            return { ...response, data };
        }
        return response;
    },

    update: async (id: string | number, data: FormData): Promise<ApiResponse<any>> => {
        return apiClient.put(`/client/resource/${id}`, data);
    },

    delete: async (id: string | number): Promise<ApiResponse<any>> => {
        return apiClient.delete(`/client/resource/${id}`);
    },
};
