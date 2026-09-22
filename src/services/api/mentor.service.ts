import { apiClient } from './client';
import type { ApiResponse } from '@/types';

export interface MentorMeProgram {
    program_id: number;
    program_ref_id: string;
    title: string;
    status: string;
    type: string;
    start_date: string;
    end_date: string;
    client_id: number;
    client_name: string;
    mentee_count: number;
}

export interface MentorMeResponse {
    mentor_id: number;
    mentor_ref_id: string;
    user_id: number;
    name: string;
    email: string;
    status: string;
    password_changed: boolean;
    password_changed_at: string | null;
    programs: MentorMeProgram[];
    total_programs: number;
    total_mentees: number;
}

export const mentorService = {
    getMe: async (): Promise<ApiResponse<MentorMeResponse>> => {
        return apiClient.get('/mentor/me');
    },
};
