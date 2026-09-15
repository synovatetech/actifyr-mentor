import { apiClient } from './client';
import type { ApiResponse } from '@/types';

// Helper to parse "DD Mon YYYY HH:MM AM/PM" strings into object
const parseDateTime = (str: string) => {
    if (!str || typeof str !== 'string') return { date: '', hh: '12', mm: '00', period: 'AM' };

    // Case 1: API format "YYYY-MM-DD HH:MM:SS"
    if (str.includes('-')) {
        const parts = str.split(' ');
        const date = parts[0];
        const timePart = parts[1] || '00:00:00';
        const timeParts = timePart.split(':');
        let hh = parseInt(timeParts[0]) || 0;
        const mm = timeParts[1] || '00';
        const period = hh >= 12 ? 'PM' : 'AM';

        // Convert to 12h format
        if (hh > 12) hh -= 12;
        if (hh === 0) hh = 12;

        return {
            date,
            hh: String(hh).padStart(2, '0'),
            mm,
            period
        };
    }

    // Case 2: Legacy or fallback "DD Mon YYYY HH:MM AM/PM"
    const parts = str.split(' ');
    if (parts.length < 4) return { date: str, hh: '12', mm: '00', period: 'AM' };
    const date = `${parts[0]} ${parts[1]} ${parts[2]}`;
    const timeParts = parts[3].split(':');
    const hh = timeParts[0] || '12';
    const mm = timeParts[1] || '00';
    const period = parts[4] || 'AM';
    return { date, hh, mm, period };
};

const mapApiToPush = (item: any) => ({
    ...item,
    id: item.id || item.notification_id,
    title: item.title || '',
    body: item.body || '',
    hasImage: !!(item.image_url || item.image)
});

const mapApiToPopup = (item: any) => ({
    ...item,
    id: item.id || item.popup_id,
    message: item.message || '',
    from: item.from || parseDateTime(item.display_from),
    until: item.until || parseDateTime(item.display_until),
    hasImage: !!(item.image_url || item.image)
});

export const pushNotificationService = {
    create: async (data: FormData): Promise<ApiResponse<any>> => {
        return apiClient.post('/client/custom-push-notification/create', data);
    },
    list: async (programId: string | number): Promise<ApiResponse<any>> => {
        const response = await apiClient.get<any>(`/client/custom-push-notification/list/${programId}`);
        if (response.success && response.data) {
            const data = response.data;
            const list = data.custom_push_notifications || data.notifications || (Array.isArray(data) ? data : []);
            return { ...response, data: list.map(mapApiToPush) };
        }
        return { ...response, data: [] };
    },
    get: async (id: string | number): Promise<ApiResponse<any>> => {
        return apiClient.get(`/client/custom-push-notification/${id}`);
    },
    update: async (id: string | number, data: FormData): Promise<ApiResponse<any>> => {
        return apiClient.put(`/client/custom-push-notification/${id}`, data);
    },
    delete: async (id: string | number): Promise<ApiResponse<any>> => {
        return apiClient.delete(`/client/custom-push-notification/${id}`);
    },
    send: async (id: string | number): Promise<ApiResponse<any>> => {
        return apiClient.post(`/client/custom-push-notification/${id}/send`);
    },
};

export const popupNotificationService = {
    create: async (data: FormData): Promise<ApiResponse<any>> => {
        return apiClient.post('/client/popup-notification/create', data);
    },
    list: async (programId: string | number): Promise<ApiResponse<any>> => {
        const response = await apiClient.get<any>(`/client/popup-notification/list/${programId}`);
        if (response.success && response.data) {
            const data = response.data;
            const list = data.popup_notifications || data.notifications || (Array.isArray(data) ? data : []);
            return { ...response, data: list.map(mapApiToPopup) };
        }
        return { ...response, data: [] };
    },
    get: async (id: string | number): Promise<ApiResponse<any>> => {
        return apiClient.get(`/client/popup-notification/${id}`);
    },
    update: async (id: string | number, data: FormData): Promise<ApiResponse<any>> => {
        return apiClient.put(`/client/popup-notification/${id}`, data);
    },
    delete: async (id: string | number): Promise<ApiResponse<any>> => {
        return apiClient.delete(`/client/popup-notification/${id}`);
    },
};

export const emailNotificationService = {
    getTemplate: async (programId: string | number): Promise<ApiResponse<any>> => {
        return apiClient.get(`/client/weekly-email-notification-template/program/${programId}`);
    },
    saveTemplate: async (data: any): Promise<ApiResponse<any>> => {
        return apiClient.post('/client/weekly-email-notification-template/save', data);
    },
};
