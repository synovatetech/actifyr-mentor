import { apiClient } from './client';
import type { ApiResponse } from '@/types';

const buildQuery = (params: Record<string, any>) => {
    const query = new URLSearchParams();
    Object.keys(params).forEach((key) => {
        if (params[key] !== undefined && params[key] !== null) {
            query.append(key, String(params[key]));
        }
    }); // fixed syntax
    return query.toString();
};

export const submissionsService = {
    listGeneral: async (params: { program_id: string | number; page?: number; page_size?: number; search_text?: string }): Promise<ApiResponse<any>> => {
        const queryString = buildQuery(params);
        return apiClient.get<any>(`/client/submissions/general?${queryString}`);
    },

    listTasks: async (params: { program_id: string | number; search_text?: string; page?: number; page_size?: number }): Promise<ApiResponse<any>> => {
        const queryString = buildQuery(params);
        return apiClient.get<any>(`/client/submissions/tasks?${queryString}`);
    },

    listTaskParticipants: async (taskId: string | number, programId: string | number): Promise<ApiResponse<any>> => {
        return apiClient.get(`/client/submissions/tasks/${taskId}/participants?program_id=${programId}`);
    },

    getDetails: async (submissionId: string | number): Promise<ApiResponse<any>> => {
        return apiClient.get(`/client/submissions/${submissionId}`);
    },
};
