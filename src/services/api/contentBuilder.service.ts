import { apiClient } from "./client";
import type { ApiResponse } from "@/types";
import type { ContentBlockType } from "@/components/features/content/content-builder.types";
import { getToken } from "@/lib/auth";
import { API_BASE_URL } from "@/constants";

/** `type` the URL segment for POST/PUT `.../component/<segment>` — hyphenated for the two types whose API `type` field uses an underscore. */
export const BLOCK_TYPE_URL_SEGMENT: Record<ContentBlockType, string> = {
  text: "text",
  media: "media",
  assessment: "questionnaire",
  tasks: "task",
  resource: "resource",
  poll: "poll",
  reflection: "reflection",
  true_false: "true-false",
  rating: "rating",
  virtual_meeting: "meeting",
  audio_response: "audio-response",
};

/** Inverse of `BLOCK_TYPE_URL_SEGMENT`, keyed by the API's `type` field (as returned on a `ComponentResponse`, underscored — not the hyphenated URL segment). */
export const API_TYPE_TO_BLOCK_TYPE: Record<string, ContentBlockType> = {
  text: "text",
  media: "media",
  questionnaire: "assessment",
  task: "tasks",
  resource: "resource",
  poll: "poll",
  reflection: "reflection",
  true_false: "true_false",
  rating: "rating",
  meeting: "virtual_meeting",
  audio_response: "audio_response",
};

export interface BuilderContentResponse {
  id: number;
  program_id: number;
  title: string;
  date: string;
  time: string;
  status: "draft" | "active";
  link_to_previous_content: boolean;
  estimated_read_time: number | null;
  language_code: string;
  translations?: Array<{ language_code: string; title?: string }>;
  created_at: string;
  updated_at: string;
}

export interface ComponentResponse {
  id: number;
  content_id: number;
  program_id: number;
  type: string;
  title: string;
  stored_title: string | null;
  order_index: number;
  language_code: string;
  data: any;
  translations?: Array<Record<string, any>>;
  created_at: string;
  updated_at: string;
}

export interface BuilderContentFullResponse extends BuilderContentResponse {
  components: ComponentResponse[];
}

export interface ImportCsvComponentSummary {
  component_order: number;
  component_id: number;
  type: string;
  title: string | null;
  items_created: number;
}

export interface ImportCsvResponse {
  content_id: number;
  program_id: number;
  status: "draft" | "active";
  components_created: number;
  items_created: number;
  components: ImportCsvComponentSummary[];
}

export interface ImportCsvTranslationComponentSummary {
  component_order: number;
  component_id: number;
  type: string;
  rows_written: number;
}

export interface ImportCsvTranslationResponse {
  content_id: number;
  program_id: number;
  language_code: string;
  components_translated: number;
  items_translated: number;
  components: ImportCsvTranslationComponentSummary[];
  skipped_components: unknown[];
}

const BASE = "/client/content-builder";

export const contentBuilderService = {
  createContent: async (data: {
    program_id: number | string;
    title: string;
    date: string;
    time: string;
    link_to_previous_content?: boolean;
    translations?: Array<{ language_code: string; title?: string }>;
  }): Promise<ApiResponse<BuilderContentResponse>> => {
    return apiClient.post(`${BASE}/content`, data);
  },

  getContent: async (
    programId: string | number,
    contentId: string | number,
    options?: { languageCode?: string; includeTranslations?: boolean },
  ): Promise<ApiResponse<BuilderContentFullResponse>> => {
    const params = new URLSearchParams();
    if (options?.languageCode) params.set("language_code", options.languageCode);
    if (options?.includeTranslations !== undefined) {
      params.set("include_translations", String(options.includeTranslations));
    }
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiClient.get(`${BASE}/content/${programId}/${contentId}${query}`);
  },

  updateContent: async (
    contentId: string | number,
    data: {
      title?: string;
      date?: string;
      time?: string;
      link_to_previous_content?: boolean;
      translations?: Array<{ language_code: string; title?: string }>;
    },
  ): Promise<ApiResponse<BuilderContentResponse>> => {
    return apiClient.put(`${BASE}/content/${contentId}`, data);
  },

  deleteContent: async (
    contentId: string | number,
  ): Promise<ApiResponse<{ message: string; content_id: number; deleted_component_count: number }>> => {
    return apiClient.delete(`${BASE}/content/${contentId}`);
  },

  listComponents: async (
    contentId: string | number,
    options?: { languageCode?: string; includeTranslations?: boolean },
  ): Promise<ApiResponse<{ components: ComponentResponse[]; total: number }>> => {
    const params = new URLSearchParams();
    if (options?.languageCode) params.set("language_code", options.languageCode);
    if (options?.includeTranslations !== undefined) {
      params.set("include_translations", String(options.includeTranslations));
    }
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiClient.get(`${BASE}/content/${contentId}/components${query}`);
  },

  addComponent: async (
    contentId: string | number,
    type: ContentBlockType,
    data: FormData | Record<string, any>,
  ): Promise<ApiResponse<ComponentResponse>> => {
    return apiClient.post(
      `${BASE}/content/${contentId}/component/${BLOCK_TYPE_URL_SEGMENT[type]}`,
      data,
    );
  },

  updateComponent: async (
    componentId: string | number,
    type: ContentBlockType,
    data: FormData | Record<string, any>,
  ): Promise<ApiResponse<ComponentResponse>> => {
    return apiClient.put(
      `${BASE}/component/${componentId}/${BLOCK_TYPE_URL_SEGMENT[type]}`,
      data,
    );
  },

  getComponent: async (
    componentId: string | number,
    options?: { languageCode?: string; includeTranslations?: boolean },
  ): Promise<ApiResponse<ComponentResponse>> => {
    const params = new URLSearchParams();
    if (options?.languageCode) params.set("language_code", options.languageCode);
    if (options?.includeTranslations !== undefined) {
      params.set("include_translations", String(options.includeTranslations));
    }
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiClient.get(`${BASE}/component/${componentId}${query}`);
  },

  deleteComponent: async (
    componentId: string | number,
  ): Promise<ApiResponse<{ message: string; component_id: number; content_status: "draft" | "active" }>> => {
    return apiClient.delete(`${BASE}/component/${componentId}`);
  },

  updateComponentMeta: async (
    componentId: string | number,
    data: { title?: string; order_index?: number },
  ): Promise<ApiResponse<ComponentResponse>> => {
    return apiClient.put(`${BASE}/component/${componentId}/meta`, data);
  },

  deleteComponentItem: async (
    componentId: string | number,
    itemId: string | number,
  ): Promise<ApiResponse<any>> => {
    return apiClient.delete(`${BASE}/component/${componentId}/item/${itemId}`);
  },

  getMissingTranslations: async (
    contentId: string | number,
  ): Promise<ApiResponse<any>> => {
    return apiClient.get(`${BASE}/content/${contentId}/missing-translations`);
  },

  /** Creates a content (and up to 10 of its non-media component types) from one CSV in a single atomic import. `formData` must carry `file`, `content_date` (YYYY-MM-DD), and `content_time` (HH:MM, 24-hour). */
  importCsv: async (
    programId: string | number,
    formData: FormData,
  ): Promise<ApiResponse<ImportCsvResponse>> => {
    return apiClient.post(`${BASE}/program/${programId}/import-csv`, formData);
  },

  /** Translates an already-imported content from one CSV. `formData` must carry `file` and `language_code` (not "en"). */
  importCsvTranslation: async (
    contentId: string | number,
    formData: FormData,
  ): Promise<ApiResponse<ImportCsvTranslationResponse>> => {
    return apiClient.post(`${BASE}/content/${contentId}/import-csv`, formData);
  },

  /**
   * Downloads the CSV bulk-import template straight from the API — the file is
   * generated server-side from the importer's own column list, so it can never
   * drift out of sync with what `importCsv`/`importCsvTranslation` actually
   * accept (unlike a hand-maintained client-side template). Triggers a browser
   * download as a side effect; bypasses `apiClient` since that always parses the
   * response as JSON.
   */
  downloadImportCsvTemplate: async (
    withSample = false,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const token = getToken();
      const query = withSample ? "?with_sample=true" : "";
      const res = await fetch(`${API_BASE_URL}${BASE}/import-csv/template${query}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        throw new Error(`Failed to download the template (status ${res.status}).`);
      }
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") || "";
      const filenameMatch = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
      const filename =
        filenameMatch?.[1] || (withSample ? "content_import_sample.csv" : "content_import_template.csv");

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to download the template.",
      };
    }
  },
};
