import { apiClient } from './client';
import type { ApiResponse } from '@/types';

export const knowledgeCardService = {
    create: async (data: FormData): Promise<ApiResponse<any>> => {
        return apiClient.post('/client/knowledge-card/create', data);
    },

    list: async (programId: string | number): Promise<ApiResponse<any[]>> => {
        const response = await apiClient.get<any>(`/client/knowledge-card/list/${programId}`);
        if (response.success && response.data) {
            const data = response.data.knowledge_cards || response.data;
            return { ...response, data: Array.isArray(data) ? data : [] };
        }
        return response;
    },

    get: async (id: string | number): Promise<ApiResponse<any>> => {
        const response = await apiClient.get<any>(`/client/knowledge-card/${id}`);
        if (response.success && response.data) {
            const data = response.data.knowledge_card || response.data;
            return { ...response, data };
        }
        return response;
    },

    update: async (id: string | number, data: FormData): Promise<ApiResponse<any>> => {
        return apiClient.put(`/client/knowledge-card/${id}`, data);
    },

    delete: async (id: string | number): Promise<ApiResponse<any>> => {
        return apiClient.delete(`/client/knowledge-card/${id}`);
    },
};
