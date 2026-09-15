import { apiClient } from './client';
import { getToken } from '@/lib/auth';
import { API_BASE_URL } from '@/constants';
import type { ApiResponse } from '@/types';

export const aiService = {
    getEstimate: async (data: any): Promise<ApiResponse<any>> => {
        return apiClient.post('/client/ai/token-estimate', data);
    },
    getTocConfigs: async (): Promise<ApiResponse<any>> => {
        return apiClient.get('/client/ai/toc/configs');
    },
    getTocList: async (configId: string | number): Promise<ApiResponse<any>> => {
        return apiClient.get(`/client/ai/toc?toc_config_id=${configId}`);
    },
    generateToc: async (data: any): Promise<ApiResponse<any>> => {
        return apiClient.post('/client/ai/toc/generate', data);
    },
    getTocItem: async (configId: string | number, itemId: string | number): Promise<ApiResponse<any>> => {
        return apiClient.get(`/client/ai/toc/${configId}/items/${itemId}`);
    },
    updateTocItem: async (configId: string | number, itemId: string | number, data: any): Promise<ApiResponse<any>> => {
        return apiClient.patch(`/client/ai/toc/${configId}/items/${itemId}`, data);
    },
    deleteTocItem: async (configId: string | number, itemId: string | number): Promise<ApiResponse<any>> => {
        return apiClient.delete(`/client/ai/toc/${configId}/items/${itemId}`);
    },
    getDaywiseContentList: async (programId?: string | number): Promise<ApiResponse<any>> => {
        const url = programId ? `/client/ai/daywise-content?program_id=${programId}` : '/client/ai/daywise-content';
        return apiClient.get(url);
    },
    generateDaywiseContent: async (data: any): Promise<ApiResponse<any>> => {
        return apiClient.post('/client/ai/daywise-content/generate', data);
    },
    getDaywiseContentDetail: async (contentId: string | number): Promise<ApiResponse<any>> => {
        return apiClient.get(`/client/ai/daywise-content/${contentId}`);
    },
    updateDaywiseContent: async (contentId: string | number, data: any): Promise<ApiResponse<any>> => {
        return apiClient.patch(`/client/ai/daywise-content/${contentId}`, data);
    },
    deleteDaywiseContent: async (contentId: string | number): Promise<ApiResponse<any>> => {
        return apiClient.delete(`/client/ai/daywise-content/${contentId}`);
    },
    generateAudio: async (data: { program_content_id: number | string; audio_script?: string; voice_name?: string }): Promise<ApiResponse<any>> => {
        return apiClient.post('/client/ai/daywise-content/generate-audio', data);
    },
    generateVideo: async (data: { program_content_id: number | string; video_script?: string }): Promise<ApiResponse<any>> => {
        return apiClient.post('/client/ai/daywise-content/generate-video', data);
    },
    /** Path id is typically `video_id` from the generate-video response. */
    getGenerateVideoStatus: async (statusPollId: string | number): Promise<ApiResponse<any>> => {
        const id = encodeURIComponent(String(statusPollId));
        return apiClient.get(`/client/ai/daywise-content/generate-video/status/${id}/`);
    },
    getAvatarGroups: async (): Promise<ApiResponse<any>> => {
        return apiClient.get('/client/ai/daywise-content/video/avatar-groups', { skipLoader: true });
    },
    getAvatarList: async (groupId: string, token?: string): Promise<ApiResponse<any>> => {
        const params = new URLSearchParams({ group_id: groupId });
        if (token) params.set('token', token);
        return apiClient.get(`/client/ai/daywise-content/video/avatar-list?${params}`, { skipLoader: true });
    },
    getVoices: async (): Promise<ApiResponse<any>> => {
        return apiClient.get('/client/ai/daywise-content/video/voices', { skipLoader: true });
    },
    getAudioVoices: async (): Promise<ApiResponse<any>> => {
        return apiClient.get('/client/ai/daywise-content/audio/voices', { skipLoader: true });
    },
    previewAudioVoice: async (voiceName: string): Promise<string> => {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/client/ai/daywise-content/audio/preview`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ voice_name: voiceName, language_code: 'en-IN' }),
        });
        if (!res.ok) throw new Error('Failed to fetch audio preview');
        const blob = await res.blob();
        return URL.createObjectURL(blob);
    },
    generateVideoWithAvatar: async (data: {
        program_content_id: number | string;
        avatar_id: string;
        voice_id: string;
        program_id: number | string;
        video_script?: string;
    }): Promise<ApiResponse<any>> => {
        return apiClient.post('/client/ai/daywise-content/generate-video', data);
    },
    translateContent: async (data: { program_content_id: number | string; language: string }): Promise<ApiResponse<any>> => {
        return apiClient.post('/client/ai/daywise-content/translate/', data);
    },
};
