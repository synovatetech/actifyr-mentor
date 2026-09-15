import { apiClient } from "./client";
import type { ApiResponse } from "@/types";

export interface Goal {
  id: number;
  program_id: number;
  user_id: number;
  user_name?: string;
  title: string;
  description: string;
  progress: number;
  progress_updated_count: number;
  target_date: string;
  notify_me: boolean;
  notification_days: number[];
  is_shared_to_trainer: boolean;
  read_status: string;
  status?: string;
  remark: string;
  created_at: string;
  updated_at: string;
  translations?: Array<{ language_code: string; title: string; description: string }>;
}

interface GoalListPayload {
  goals: Goal[];
  total: number;
}

const parseGoalList = (data: Goal[] | GoalListPayload): Goal[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.goals)) return data.goals;
  return [];
};

export const goalsService = {
  // data: { program_id, title, description }
  create: async (data: Record<string, unknown>): Promise<ApiResponse<Goal>> => {
    return apiClient.post("/client/goal/create", data);
  },

  list: async (programId: string | number): Promise<ApiResponse<Goal[]>> => {
    const response = await apiClient.get<Goal[] | GoalListPayload>(
      `/client/goal/list/${programId}`,
    );
    return { ...response, data: parseGoalList(response.data) };
  },
  listParticipant: async (
    programId: string | number,
    search?: string,
  ): Promise<ApiResponse<Goal[]>> => {
    const query = search?.trim() ? `?search_text=${encodeURIComponent(search.trim())}` : '';
    const response = await apiClient.get<Goal[] | GoalListPayload>(
      `/client/goal/participant-goals/list/${programId}${query}`,
    );
    return { ...response, data: parseGoalList(response.data) };
  },

  getHelpContent: async (
    id: string | number,
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.get(`/client/goal/help-content/${id}`);
  },

  // data: FormData (help_content, video)
  updateHelpContent: async (
    id: string | number,
    data: FormData,
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.post(`/client/goal/help-content/${id}`, data);
  },

  get: async (id: string | number): Promise<ApiResponse<Goal>> => {
    return apiClient.get(`/client/goal/${id}`);
  },

  getParticipantGoal: async (
    id: string | number,
  ): Promise<ApiResponse<Goal>> => {
    return apiClient.get(`/client/goal/participant-goals/${id}`);
  },

  update: async (
    id: string | number,
    data: Record<string, unknown>,
  ): Promise<ApiResponse<Goal>> => {
    return apiClient.put(`/client/goal/${id}`, data);
  },

  delete: async (
    id: string | number,
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.delete(`/client/goal/${id}`);
  },
};
