import { apiClient } from './client';
import type { ApiResponse } from '@/types';

export interface ParticipantsListOptions {
    search?: string;
    page?: number;
    pageSize?: number;
}

export const participantsService = {
    list: async (
        programId: string | number,
        options?: ParticipantsListOptions,
    ): Promise<ApiResponse<any[]> & { programStats?: Record<string, number>; total?: number }> => {
        const { search, page = 1, pageSize = 100 } = options ?? {};

        const query = new URLSearchParams();
        if (search?.trim()) query.append('search_text', search.trim());
        query.append('page', String(page));
        query.append('page_size', String(pageSize));

        const response = await apiClient.get<any>(
            `/client/programs/${programId}/participants/participants?${query.toString()}`,
        );
        if (response.success && response.data) {
            const data = response.data.items || response.data.participants || response.data;
            const programStats: Record<string, number> = {
                max_leaderboard_points: response.data.max_leaderboard_points ?? 0,
                max_engagement_points: response.data.max_engagement_points ?? 0,
                max_effectiveness_points: response.data.max_effectiveness_points ?? 0,
                total_tasks: response.data.total_tasks ?? 0,
                total_general_tasks: response.data.total_general_tasks ?? 0,
                total_poi_tasks: response.data.total_poi_tasks ?? 0,
                total_poa_tasks: response.data.total_poa_tasks ?? 0,
                total_pow_tasks: response.data.total_pow_tasks ?? 0,
            };
            return {
                ...response,
                data: Array.isArray(data) ? data : [],
                programStats,
                total: response.data.total,
            };
        }
        return { ...response, data: [] };
    },

    getStats: async (programId: string | number): Promise<ApiResponse<any>> => {
        // This might be provided by a specialized endpoint or part of list
        return apiClient.get(`/client/programs/${programId}/participants/stats`);
    }
};
