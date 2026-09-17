import { apiClient } from './client';
import type { ApiResponse } from '@/types';

export const supportService = {
    list: async (): Promise<ApiResponse<any>> => {
        return apiClient.get('/client/support-ticket/list');
    },

    get: async (id: string | number): Promise<ApiResponse<any>> => {
        return apiClient.get(`/client/support-ticket/${id}`);
    },

    // POST /client/support-ticket/{id}/respond is client-only (403 for a mentor
    // token) — this portal is mentor-only, so no respond method is exposed here.
};
