import { apiClient } from './client';
import type { ApiResponse } from '@/types';

export interface TranslationLanguageStatus {
    language_code: string;
    is_complete: boolean;
    missing: Record<string, boolean | number[]>;
}

export interface MissingTranslationsResponse {
    program_id: number;
    content_id?: number;
    supported_languages: string[];
    languages: TranslationLanguageStatus[];
}

export const missingTranslationsService = {
    getForContent: (contentId: string | number): Promise<ApiResponse<MissingTranslationsResponse>> => {
        return apiClient.get(`/client/content/${contentId}/missing-translations`);
    },

    getForProgram: (programId: string | number): Promise<ApiResponse<MissingTranslationsResponse>> => {
        return apiClient.get(`/client/program/${programId}/missing-translations`);
    },
};
