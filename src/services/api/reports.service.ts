import { apiClient } from './client';
import type { ApiResponse } from '@/types';

interface SendTaskEmailPayload {
  participants: Array<number | string>;
  subject: string;
  content: string;
}

interface TaskReportPayload {
  content_ids: string[];
  participant_ids: string[];
  status: 'completed' | 'pending' | 'any';
}

interface PerformanceReportPayload {
  participants: string[];
  fields: string[];
}

interface AssessmentReportPayload {
  participants: string[];
  start_date: string;
  end_date: string;
}

export const reportsService = {
  sendTaskEmail: async (
    reportId: string | number,
    payload: SendTaskEmailPayload,
  ): Promise<ApiResponse<any>> => {
    return apiClient.post(`/client/report/${reportId}/task/send-email`, payload);
  },

  getTaskReport: async (
    reportId: string | number,
    payload: TaskReportPayload,
  ): Promise<ApiResponse<any>> => {
    return apiClient.post(`/client/report/${reportId}/task`, payload);
  },

  getReportParticipants: async (reportId: string | number): Promise<ApiResponse<any>> => {
    return apiClient.get(`/client/report/${reportId}/participants`);
  },

  getReportContents: async (reportId: string | number): Promise<ApiResponse<any>> => {
    return apiClient.get(`/client/report/${reportId}/contents`);
  },

  getPerformanceReport: async (
    reportId: string | number,
    payload: PerformanceReportPayload,
  ): Promise<ApiResponse<any>> => {
    return apiClient.post(`/client/report/${reportId}/performance`, payload);
  },

  getAssessmentReport: async (
    reportId: string | number,
    payload: AssessmentReportPayload,
  ): Promise<ApiResponse<any>> => {
    return apiClient.post(`/client/report/${reportId}/assessment`, payload);
  },
};
