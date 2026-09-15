import { apiClient } from "./client";
import type { ApiResponse } from "@/types";

export interface ContentRatingReview {
  user_name: string;
  rating: number;
  review: string;
}

export interface ContentRatingsData {
  review_date: string;
  content_title: string;
  average_rating: number;
  reviews: ContentRatingReview[];
}

export interface ContentRatingsApiEnvelope {
  status: boolean;
  message: string;
  data: ContentRatingsData;
}

export const contentService = {
  create: async (data: FormData): Promise<ApiResponse<any>> => {
    return apiClient.post("/client/content/create", data);
  },
  update: async (
    contentId: string | number,
    data: FormData,
  ): Promise<ApiResponse<any>> => {
    return apiClient.put(`/client/content/${contentId}/update`, data);
  },
  translate: async (
    contentId: string | number,
    data: FormData,
  ): Promise<ApiResponse<any>> => {
    return apiClient.post(`/client/content/${contentId}/translate`, data);
  },
  listScheduled: async (
    programId: string | number,
    month?: number,
    year?: number,
  ): Promise<ApiResponse<any>> => {
    const now = new Date();
    const m = month !== undefined && month !== null ? month : now.getMonth();
    const y = year !== undefined && year !== null ? year : now.getFullYear();

    const url = `/client/content/list/scheduled-learning?program_id=${programId}&month=${m}&year=${y}`;
    const response = await apiClient.get<any>(url);
    if (response.success && response.data) {
      // If data is an object with 'contents', preserve it to keep metadata like program_start_date
      if (
        !Array.isArray(response.data) &&
        (response.data.contents || response.data.scheduled_contents)
      ) {
        return response;
      }
      const data =
        response.data.contents ||
        response.data.scheduled_contents ||
        response.data;
      return { ...response, data: Array.isArray(data) ? data : [] };
    }
    return response;
  },
  listModular: async (
    programId: string | number,
  ): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get<any>(
      `/client/content/list/modular-learning?program_id=${programId}`,
    );
    if (response.success && response.data) {
      const data =
        response.data.modular_contents ||
        response.data.contents ||
        response.data;
      return { ...response, data: Array.isArray(data) ? data : [] };
    }
    return response;
  },
  listJourney: async (
    programId: string | number,
  ): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get<any>(
      `/client/content/list/journey-learning?program_id=${programId}`,
    );
    if (response.success && response.data) {
      const data =
        response.data.journey_contents ||
        response.data.contents ||
        response.data;
      return { ...response, data: Array.isArray(data) ? data : [] };
    }
    return response;
  },
  getProgramContentCount: async (
    programId: string | number,
  ): Promise<
    ApiResponse<{ total_content: number; is_ai_generated: boolean }>
  > => {
    return apiClient.get(`/client/program/${programId}/content-count`);
  },
  delete: async (contentId: string | number): Promise<ApiResponse<any>> => {
    return apiClient.delete(`/client/content/${contentId}`);
  },
  getById: async (
    contentId: string | number,
    programId: string | number,
    languageCode?: string,
  ): Promise<ApiResponse<any>> => {
    const langParam = languageCode ? `&language_code=${languageCode}` : "";
    return apiClient.get(
      `/client/content/${contentId}?program_id=${programId}${langParam}`,
    );
  },
  getRatings: async (
    contentId: string | number,
    programId: string | number,
  ): Promise<ApiResponse<ContentRatingsData | ContentRatingsApiEnvelope>> => {
    return apiClient.get(
      `/client/content/ratings/${contentId}?program_id=${programId}`,
    );
  },
  reschedule: async (
    programId: string | number,
    contentIncludeDays: number[],
    holidays: string[],
  ): Promise<ApiResponse<any>> => {
    return apiClient.post("/client/content/reschedule", {
      program_id: programId,
      content_include_days: contentIncludeDays,
      holidays,
    });
  },
  sortOrder: async (data: {
    program_id: string | number;
    content_ids: number[];
  }): Promise<ApiResponse<any>> => {
    return apiClient.post("/client/content/sort-order", data);
  },
};
