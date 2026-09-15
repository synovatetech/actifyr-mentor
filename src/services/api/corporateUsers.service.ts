import { apiClient } from "./client";

export interface CorporateUserRecord {
  id: number;
  corporate_user_ref_id?: string;
  name: string;
  email: string;
  status?: string;
  corporate_user_id?: number | null;
  participant_id?: number | null;
  user_id?: number | null;
  total_program_enrolled_count?: number;
  invited_on?: string;
  expire_on?: string;
  created_at?: string;
}

export const corporateUsersService = {
  getUsers: (params: { search?: string; page?: number; page_size?: number }) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.page != null) qs.set("page", String(params.page));
    if (params.page_size != null) qs.set("page_size", String(params.page_size));
    const query = qs.toString();
    return apiClient.get<any>(
      `/client/corporate-users${query ? `?${query}` : ""}`,
    );
  },

  addUser: (payload: { email: string; name: string }) =>
    apiClient.post<any>("/client/corporate-users", payload),

  addUsersBulk: (payload: { users: Array<{ email: string; name: string }> }) =>
    apiClient.post<any>("/client/corporate-users/bulk", payload),

  checkEmails: (emails: string[]) =>
    apiClient.post<any>("/client/corporate-users/check-emails", { emails }),

  updateName: (corporateUserId: number, name: string) =>
    apiClient.patch<any>(`/client/corporate-users/${corporateUserId}/name`, {
      name,
    }),

  deactivate: (corporateUserId: number) =>
    apiClient.post<any>(
      `/client/corporate-users/${corporateUserId}/deactivate`,
      {},
    ),

  getProgramUsers: (programId: string | number, params: { page?: number; page_size?: number; search?: string } = {}) => {
    const qs = new URLSearchParams();
    qs.set("page", String(params.page ?? 1));
    qs.set("page_size", String(params.page_size ?? 20));
    if (params.search) qs.set("search_text", params.search);
    return apiClient.get<any>(`/client/programs/${programId}/corporate-users?${qs.toString()}`);
  },

  enrollUser: (corporateUserId: number, programId: number | string) =>
    apiClient.post<any>(`/client/corporate-users/${corporateUserId}/programs`, {
      program_id: Number(programId),
    }),

  bulkEnroll: (programId: number | string, corporateUserIds: number[]) =>
    apiClient.post<any>("/client/corporate-users/bulk-enroll", {
      program_id: Number(programId),
      corporate_user_ids: corporateUserIds,
    }),

  removeFromProgram: (corporateUserId: number, programId: number | string) =>
    apiClient.delete<any>(`/client/corporate-users/${corporateUserId}/programs/${programId}`),

  getAccessCode: (programId: number | string) =>
    apiClient.get<any>(`/client/programs/${programId}/corporate-access-code`),

  createAccessCode: (programId: number | string, accessCode: string) =>
    apiClient.post<any>(`/client/programs/${programId}/corporate-access-code`, { access_code: accessCode }),

  deleteAccessCode: (programId: number | string) =>
    apiClient.delete<any>(`/client/programs/${programId}/corporate-access-code`),

  /** Renews (extends by 1 year) each listed corporate user, consuming one license seat
   * per user. Pass `["all"]` to target every user currently in `expired` status instead
   * of an explicit id list. All-or-nothing: the seat pool is sized against the whole
   * batch up front, so a shortfall fails the whole call with 402 and renews nobody —
   * it never returns a partial `renewed` count. */
  bulkRenew: (corporateUserIds: number[] | ["all"]) =>
    apiClient.post<BulkRenewResponse>("/client/corporate-users/bulk-renew", {
      corporate_user_ids: corporateUserIds,
    }),
};

export interface BulkRenewResponse {
  renewed: number;
  failed: Array<{ corporate_user_id: number; reason: string }>;
}
