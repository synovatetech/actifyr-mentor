import { apiClient } from './client';
import type { ApiResponse } from '@/types';

export const teamsService = {
    create: async (programId: string | number, data: { team_name: string }): Promise<ApiResponse<any>> => {
        return apiClient.post(`/client/programs/${programId}/teams`, data);
    },

    list: async (programId: string | number): Promise<ApiResponse<any[]>> => {
        const response = await apiClient.get<any>(`/client/programs/${programId}/teams`);
        if (response.success && response.data) {
            const data = response.data.teams || response.data;
            return { ...response, data: Array.isArray(data) ? data : [] };
        }
        return { ...response, data: [] };
    },

    listParticipants: async (programId: string | number): Promise<ApiResponse<any>> => {
        return apiClient.get(`/client/programs/${programId}/teams/participants`);
    },

    assignParticipants: async (programId: string | number, assignments: { participant_id: number; team_id: number }[]): Promise<ApiResponse<any>> => {
        return apiClient.put(`/client/programs/${programId}/teams/assignments`, { assignments });
    },

    get: async (programId: string | number, teamId: string | number): Promise<ApiResponse<any>> => {
        return apiClient.get(`/client/programs/${programId}/teams/${teamId}`);
    },

    removeParticipant: async (programId: string | number, teamId: string | number, participantId: string | number): Promise<ApiResponse<any>> => {
        return apiClient.delete(`/client/programs/${programId}/teams/${teamId}/participants/${participantId}`);
    },

    deleteTeam: async (programId: string | number, teamId: string | number): Promise<ApiResponse<any>> => {
        return apiClient.delete(`/client/programs/${programId}/teams/${teamId}`);
    },
};
