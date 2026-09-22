import { apiClient } from './client';
import type { ApiResponse } from '@/types';
import type { MentorLoginRequest, MentorLoginResponse } from '@/types/auth';
import { useClientStore } from '@/store/clientStore';
import { useAuthStore } from '@/store/authStore';
import { useMentorStore } from '@/store/mentorStore';

export const authService = {
    // Tokens are set as httpOnly cookies by src/app/api/auth/mentor/login/route.ts —
    // this response never contains them, so there's nothing to store client-side.
    login: async (credentials: MentorLoginRequest): Promise<ApiResponse<MentorLoginResponse>> => {
        return apiClient.post<MentorLoginResponse>('/auth/mentor/login', credentials);
    },

    changePassword: async (data: {
        current_password: string;
        new_password: string;
    }): Promise<ApiResponse<{ message: string; password_changed: boolean; password_changed_at: string }>> => {
        return apiClient.post('/auth/mentor/change-password', data);
    },

    requestPasswordReset: async (data: { email: string }): Promise<ApiResponse<any>> => {
        return apiClient.post('/auth/mentor/request-password-reset', data);
    },

    resetPassword: async (data: { token: string; new_password: string }): Promise<ApiResponse<any>> => {
        return apiClient.post('/auth/mentor/reset-password', data);
    },

    // Purely local: no backend logout endpoint exists. The httpOnly cookies
    // can only be cleared server-side, hence the call to our own route.
    logout: async () => {
        try {
            await apiClient.post('/auth/mentor/logout');
        } finally {
            useAuthStore.getState().logout();
            useClientStore.getState().reset();
            useMentorStore.getState().reset();
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
        }
    },
};
