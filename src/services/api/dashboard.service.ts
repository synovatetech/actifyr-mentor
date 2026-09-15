import { apiClient } from "./client";
import type { ApiResponse } from "@/types";

type CountGroup = Record<string, number>;

export interface DashboardActivity {
  id?: string | number;
  title?: string;
  message?: string;
  description?: string;
  activity?: string;
  status?: string;
  time?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface ClientDashboardData {
  programs: CountGroup;
  user_licenses: CountGroup;
  admins: CountGroup;
  mentors: CountGroup;
  feedbacks: CountGroup;
  support: CountGroup;
  recent_activity: DashboardActivity[];
}

const EMPTY_DASHBOARD_DATA: ClientDashboardData = {
  programs: { active: 0, draft: 0, expired: 0 },
  user_licenses: { active: 0, expired: 0, expiring_in_30_days: 0 },
  admins: { active: 0 },
  mentors: { active: 0 },
  feedbacks: { unread: 0 },
  support: { open: 0 },
  recent_activity: [],
};

const normalizeCountGroup = (
  source: unknown,
  fallback: CountGroup,
): CountGroup => {
  if (!source || typeof source !== "object") {
    return fallback;
  }

  const normalized: CountGroup = { ...fallback };
  for (const key of Object.keys(fallback)) {
    const value = (source as Record<string, unknown>)[key];
    normalized[key] = Number(value ?? fallback[key]) || 0;
  }
  return normalized;
};

export const dashboardService = {
  getDashboard: async (): Promise<ApiResponse<ClientDashboardData>> => {
    const response = await apiClient.get<any>("/client/dashboard");

    if (!response.success || !response.data) {
      return {
        success: false,
        data: EMPTY_DASHBOARD_DATA,
        error: response.error || "Failed to fetch dashboard data",
      };
    }

    const payload = response.data as {
      status?: boolean;
      message?: string;
      data?: Partial<ClientDashboardData>;
    };
    const rawData = payload.data || {};

    return {
      success: payload.status ?? true,
      message: payload.message,
      data: {
        programs: normalizeCountGroup(
          rawData.programs,
          EMPTY_DASHBOARD_DATA.programs,
        ),
        user_licenses: normalizeCountGroup(
          rawData.user_licenses,
          EMPTY_DASHBOARD_DATA.user_licenses,
        ),
        admins: normalizeCountGroup(
          rawData.admins,
          EMPTY_DASHBOARD_DATA.admins,
        ),
        mentors: normalizeCountGroup(
          rawData.mentors,
          EMPTY_DASHBOARD_DATA.mentors,
        ),
        feedbacks: normalizeCountGroup(
          rawData.feedbacks,
          EMPTY_DASHBOARD_DATA.feedbacks,
        ),
        support: normalizeCountGroup(
          rawData.support,
          EMPTY_DASHBOARD_DATA.support,
        ),
        recent_activity: Array.isArray(rawData.recent_activity)
          ? (rawData.recent_activity as DashboardActivity[])
          : [],
      },
    };
  },
};
