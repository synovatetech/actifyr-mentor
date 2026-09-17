import { apiClient } from './client';
import { setToken, setRefreshToken, removeToken, setMentorProfile, removeMentorProfile } from '@/lib/auth';
import type { ApiResponse } from '@/types';
import type { MentorLoginRequest, MentorLoginResponse } from '@/types/auth';
import { useClientStore } from '@/store/clientStore';
import { useAuthStore } from '@/store/authStore';

export const authService = {
    login: async (credentials: MentorLoginRequest): Promise<ApiResponse<MentorLoginResponse>> => {
        const response = await apiClient.post<MentorLoginResponse>('/auth/mentor/login', credentials);

        if (response.success && response.data) {
            const { access_token, refresh_token, mentor_id, name, email, role } = response.data;

            if (access_token) {
                setToken(access_token);
            }
            if (refresh_token) {
                setRefreshToken(refresh_token);
            }
            if (mentor_id != null) {
                setMentorProfile({ mentorId: mentor_id, name, email, role: role || 'mentor' });
            }
        }
        return response;
    },

    changePassword: async (data: {
        current_password: string;
        new_password: string;
    }): Promise<ApiResponse<{ message: string }>> => {
        return apiClient.post('/auth/mentor/change-password', data);
    },

    requestPasswordReset: async (data: { email: string }): Promise<ApiResponse<any>> => {
        return apiClient.post('/auth/mentor/request-password-reset', data);
    },

    resetPassword: async (data: { token: string; new_password: string }): Promise<ApiResponse<any>> => {
        return apiClient.post('/auth/mentor/reset-password', data);
    },

    logout: () => {
        removeToken();
        removeMentorProfile();
        useAuthStore.getState().logout();
        useClientStore.getState().reset();
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
    },
};
