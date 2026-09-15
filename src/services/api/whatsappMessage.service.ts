import { apiClient } from "./client";
import type { ApiResponse } from "@/types";

export interface WhatsappTemplate {
  name: string;
  body: string;
}

export const whatsappMessageService = {
  listTemplates: async (): Promise<ApiResponse<WhatsappTemplate[]>> => {
    const response = await apiClient.get<any>("/client/whatsapp-message/templates");
    if (response.success && response.data) {
      const data = response.data.data || response.data.templates || response.data;
      return {
        ...response,
        data: Array.isArray(data) ? (data as WhatsappTemplate[]) : [],
      };
    }
    return { ...response, data: [] };
  },

  sendMessage: async (payload: {
    template_name: string;
    program_id: number;
    participant_ids: number[];
  }): Promise<ApiResponse<any>> => {
    return apiClient.post("/client/whatsapp-message/send", payload);
  },
};

