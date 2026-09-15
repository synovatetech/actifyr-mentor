import { apiClient } from './client';
import type { ApiResponse } from '@/types';

export const scoringService = {
    // Point Configuration
    listPointConfigs: async (programId: string | number): Promise<ApiResponse<any[]>> => {
        const response = await apiClient.get<any>(`/client/programs/${programId}/points/leaderboard`);
        if (response.success && response.data) {
            const data = response.data.configs || response.data.points_configs || response.data;
            return { ...response, data: Array.isArray(data) ? data : [] };
        }
        return { ...response, data: [] };
    },

    getPointConfig: async (programId: string | number, configId: string | number): Promise<ApiResponse<any>> => {
        return apiClient.get(`/client/programs/${programId}/points/leaderboard/${configId}`);
    },

    updatePointConfig: async (programId: string | number, configId: string | number, data: any): Promise<ApiResponse<any>> => {
        return apiClient.put(`/client/programs/${programId}/points/leaderboard/${configId}`, data);
    },

    // Badge Configuration
    listBadges: async (programId: string | number): Promise<ApiResponse<any[]>> => {
        const response = await apiClient.get<any>(`/client/programs/${programId}/badges/config`);
        if (response.success && response.data) {
            const data = response.data.configs || response.data.badges || response.data;
            return { ...response, data: Array.isArray(data) ? data : [] };
        }
        return { ...response, data: [] };
    },

    getBadge: async (programId: string | number, badgeId: string | number): Promise<ApiResponse<any>> => {
        return apiClient.get(`/client/programs/${programId}/badges/config/${badgeId}`);
    },

    updateBadge: async (programId: string | number, badgeId: string | number, data: any): Promise<ApiResponse<any>> => {
        return apiClient.put(`/client/programs/${programId}/badges/config/${badgeId}`, data);
    },

    addReward: async (programId: string | number, badgeId: string | number, data: any): Promise<ApiResponse<any>> => {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(key, value as string | Blob);
            }
        });
        return apiClient.post(`/client/programs/${programId}/badges/config/${badgeId}/reward`, formData);
    },

    updateReward: async (
        programId: string | number,
        badgeId: string | number,
        data: any,
    ): Promise<ApiResponse<any>> => {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(key, value as string | Blob);
            }
        });

        return apiClient.put(
            `/client/programs/${programId}/badges/config/${badgeId}/reward`,
            formData,
        );
    },

    deleteReward: async (
        programId: string | number,
        badgeId: string | number,
        type: 'individual' | 'team',
    ): Promise<ApiResponse<any>> => {
        const formData = new FormData();
        formData.append('type', type);

        // Some backends accept type in query; we also send it in multipart body for compatibility.
        const endpoint = `/client/programs/${programId}/badges/config/${badgeId}/reward?type=${type}`;
        return apiClient.delete(endpoint, { body: formData });
    },

    // Custom Points Configuration
    listCustomPoints: async (programId: string | number): Promise<ApiResponse<any[]>> => {
        const response = await apiClient.get<any>(`/client/programs/${programId}/custom-points`);
        if (response.success && response.data) {
            const data =
                response.data.configs ||
                response.data.custom_points ||
                response.data.customPoints ||
                response.data.data ||
                response.data;
            return { ...response, data: Array.isArray(data) ? data : [] };
        }
        return { ...response, data: [] };
    },

    createCustomPoint: async (programId: string | number, data: {
        title: string;
        description: string;
        max_point: number;
    }): Promise<ApiResponse<any>> => {
        return apiClient.post(`/client/programs/${programId}/custom-points`, data);
    },

    updateCustomPoint: async (
        programId: string | number,
        customPointId: string | number,
        data: {
            title: string;
            description: string;
            max_point: number;
        },
    ): Promise<ApiResponse<any>> => {
        return apiClient.put(`/client/programs/${programId}/custom-points/${customPointId}`, data);
    },

    deleteCustomPoint: async (
        programId: string | number,
        customPointId: string | number,
    ): Promise<ApiResponse<any>> => {
        return apiClient.delete(`/client/programs/${programId}/custom-points/${customPointId}`);
    },

    assignCustomPoint: async (
        programId: string | number,
        data: {
            participant_id: string | number;
            custom_point_id: string | number;
            point: number;
        },
    ): Promise<ApiResponse<any>> => {
        return apiClient.post(`/client/programs/${programId}/custom-points/assign`, data);
    },
};
