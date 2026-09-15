import { apiClient } from './client';
import { getToken } from '@/lib/auth';
import type { ApiResponse } from '@/types';

export const certificateService = {
    createOrUpdateCertificate: async (programId: string, data: any): Promise<ApiResponse<any>> => {
        // According to postman collection, it's a FormData POST request
        const formData = new FormData();
        formData.append('title', data.title || '');
        formData.append('description', data.description || '');
        formData.append('is_enabled', data.is_enabled ? '1' : '0');
        if (data.download_allowed_from) {
            formData.append('download_allowed_from', data.download_allowed_from);
        }
        formData.append('authorized_signatory_title', data.authorized_signatory_title || '');
        formData.append('template_id', data.template_id?.toString() || '1');

        if (data.company_logo && data.company_logo instanceof File) {
            formData.append('company_logo', data.company_logo);
        }
        if (data.course_logo && data.course_logo instanceof File) {
            formData.append('course_logo', data.course_logo);
        }
        if (data.certificate_seal && data.certificate_seal instanceof File) {
            formData.append('certificate_seal', data.certificate_seal);
        }
        if (data.authorized_signature && data.authorized_signature instanceof File) {
            formData.append('authorized_signature', data.authorized_signature);
        }

        return apiClient.post(`/client/programs/${programId}/certificate`, formData);
    },

    getTemplates: async (programId: string): Promise<ApiResponse<any>> => {
        return apiClient.get(`/client/programs/${programId}/certificate/templates`);
    },

    previewCertificate: async (programId: string): Promise<string> => {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || '/api'}/client/programs/${programId}/certificate/preview`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        if (!response.ok) {
            throw new Error(`${response.status}`);
        }
        return response.text();
    }
};
