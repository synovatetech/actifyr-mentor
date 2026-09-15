import { apiClient } from './client';
import type { ApiResponse } from '@/types';

interface AddressPayload {
    full_address: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
}

interface UpdateMePayload {
    account_details: {
        full_name: string;
        organization_name: string;
        mobile_number: string;
        address: AddressPayload;
    };
    billing_info: {
        billing_name: string;
        billing_address: AddressPayload;
        gst_number: string;
    };
}

export const clientAdminService = {
    getMe: async (): Promise<ApiResponse<any>> => {
        return apiClient.get('/client/me');
    },

    listAdmins: async (searchText = ''): Promise<ApiResponse<any>> => {
        const params = searchText.trim() ? `?search_text=${encodeURIComponent(searchText.trim())}` : '';
        return apiClient.get(`/client/client_admin${params}`);
    },

    getAdminDetails: async (): Promise<ApiResponse<any>> => {
        return apiClient.get('/client/client_admin/details');
    },

    createAdmin: async (payload: { name: string; email: string }): Promise<ApiResponse<any>> => {
        return apiClient.post('/client/client_admin', payload);
    },

    updateAdminName: async (adminId: string | number, payload: { name: string }): Promise<ApiResponse<any>> => {
        return apiClient.put(`/client/client_admin/${adminId}/name`, payload);
    },

    deleteAdmin: async (adminId: string | number, payload: { transfer_to_client_admin_id: number }): Promise<ApiResponse<any>> => {
        return apiClient.post(`/client/client_admin/${adminId}`, payload);
    },

    updateMe: async (payload: UpdateMePayload): Promise<ApiResponse<any>> => {
        return apiClient.put('/client/me', payload);
    },

    updateLogo: async (clientId: string | number, file: File): Promise<ApiResponse<any>> => {
        const formData = new FormData();
        formData.append('file', file);
        return apiClient.post(`/client/${clientId}/logo`, formData);
    },

    /** Corporate plans only — the API rejects this with 400 otherwise. */
    updateLicenseAutoRenewal: async (enabled: boolean): Promise<ApiResponse<{ license_auto_renewal: boolean }>> => {
        return apiClient.put('/client/me/license-auto-renewal', { enabled });
    },
};
