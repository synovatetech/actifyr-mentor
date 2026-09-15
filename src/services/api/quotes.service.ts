import { apiClient } from './client';
import type { ApiResponse } from '@/types';

export interface QuoteTranslation {
    language_code: string;
    text: string;
}

export interface UpdateQuotePayload {
    text: string;
    translations: QuoteTranslation[];
}

export const quotesService = {
    get: async (programId: string | number): Promise<ApiResponse<any>> => {
        return apiClient.get(`/client/quotes/${programId}`);
    },

    update: async (id: string | number, data: UpdateQuotePayload): Promise<ApiResponse<any>> => {
        return apiClient.put(`/client/quotes/${id}`, data);
    },
};
