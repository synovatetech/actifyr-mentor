import { apiClient } from "./client";
import type { ApiResponse } from "@/types";

export interface Habit {
  id: number;
  program_id: number;
  user_id: number;
  user_name?: string;
  participant_name?: string;
  participant_email?: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  frequency: number[];
  notify_me: boolean;
  notify_time: string | null;
  is_shared_to_trainer: boolean;
  read_status: string;
  status?: string;
  created_at: string;
  updated_at: string;
  progress_count: number | null;
  progress_by_week: unknown[] | null;
  translations?: Array<{ language_code: string; title: string; description: string }>;
}

interface HabitListPayload {
  habits: Habit[];
  total?: number;
}

interface HabitProgressDayMap {
  [day: string]: "completed" | "missed" | "pending" | "disabled";
}

interface HabitProgressWeek {
  week_number: number;
  date_range: { start: string; end: string };
  days: HabitProgressDayMap;
}

export interface HabitProgressResponse {
  start_date: string;
  end_date: string;
  weeks: HabitProgressWeek[];
}

const parseHabitList = (data: Habit[] | HabitListPayload): Habit[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.habits)) return data.habits;
  return [];
};

export const habitsService = {
  // data: { program_id, title, description }
  create: async (data: Record<string, unknown>): Promise<ApiResponse<Habit>> => {
    return apiClient.post("/client/habit/create", data);
  },

  list: async (programId: string | number): Promise<ApiResponse<Habit[]>> => {
    const response = await apiClient.get<Habit[] | HabitListPayload>(
      `/client/habit/list/${programId}`,
    );
    return { ...response, data: parseHabitList(response.data) };
  },

  listParticipant: async (
    programId: string | number,
    search?: string,
  ): Promise<ApiResponse<Habit[]>> => {
    const query = search?.trim() ? `?search_text=${encodeURIComponent(search.trim())}` : '';
    const response = await apiClient.get<Habit[] | HabitListPayload>(
      `/client/habit/participant-habits/list/${programId}${query}`,
    );
    return { ...response, data: parseHabitList(response.data) };
  },
  getHelpContent: async (
    id: string | number,
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.get(`/client/habit/help-content/${id}`);
  },

  // data: FormData (help_content, video)
  updateHelpContent: async (
    id: string | number,
    data: FormData,
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.post(`/client/habit/help-content/${id}`, data);
  },

  get: async (id: string | number): Promise<ApiResponse<Habit>> => {
    return apiClient.get(`/client/habit/${id}`);
  },

  getParticipantHabit: async (
    id: string | number,
  ): Promise<ApiResponse<Habit>> => {
    return apiClient.get(`/client/habit/participant-habits/${id}`);
  },

  getProgress: async (
    id: string | number,
  ): Promise<ApiResponse<HabitProgressResponse>> => {
    return apiClient.get(
      `/client/habit/participant-habits/${id}/view-progress`,
    );
  },

  update: async (
    id: string | number,
    data: Record<string, unknown>,
  ): Promise<ApiResponse<Habit>> => {
    return apiClient.put(`/client/habit/${id}`, data);
  },

  delete: async (
    id: string | number,
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.delete(`/client/habit/${id}`);
  },
};
