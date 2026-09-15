import { apiClient } from './client';
import type { ApiResponse } from '@/types';

export const languagesService = {
    list: (): Promise<ApiResponse<any>> => {
        return apiClient.get('/languages');
    },
};
