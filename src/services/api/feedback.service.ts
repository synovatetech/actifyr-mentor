import { apiClient } from './client';
import type { ApiResponse } from '@/types';

export interface FeedbackItem {
    id: string;
    ref_id: string;
    received_on: string;
    sender_name: string;
    sender_email: string;
    program_name: string;
    status: 'read' | 'unread';
}

export interface FeedbackDetail {
    id: string;
    ref_id: string;
    received_on: string;
    sender_name: string;
    sender_email: string;
    program_name: string;
    status: 'read' | 'unread';
    rating_for_program: number;
    feedback_for_program: string;
    rating_for_trainer: number;
    feedback_for_trainer: string;
}

export const feedbackService = {
    list: async (): Promise<ApiResponse<FeedbackItem[]>> => {
        const response = await apiClient.get<any>('/client/feedback/list');
        if (response.success && response.data) {
            // API returns { items: [...], total: N }
            const items: FeedbackItem[] = Array.isArray(response.data.items)
                ? response.data.items
                : Array.isArray(response.data.feedbacks)
                    ? response.data.feedbacks
                    : Array.isArray(response.data)
                        ? response.data
                        : [];
            return { success: true, data: items };
        }
        return { success: false, data: [], error: response.error || 'Failed to fetch feedbacks' };
    },

    getDetail: async (feedbackId: string): Promise<ApiResponse<FeedbackDetail>> => {
        const response = await apiClient.get<any>(`/client/feedback/${feedbackId}`);
        if (response.success && response.data) {
            const d = response.data.feedback ?? response.data.item ?? response.data;
            return { success: true, data: d };
        }
        return { success: false, data: {} as FeedbackDetail, error: response.error || 'Failed to fetch feedback detail' };
    },
};
