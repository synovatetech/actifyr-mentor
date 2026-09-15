// ============================================
// Programs API Service
// ============================================

import { apiClient } from "./client";
import type { Program, ApiResponse } from "@/types";

export interface JourneyImage {
  id: number;
  template_name: string;
  template_key: string;
  image_path: string;
}
import { convert12HourTimeToUtcHHMM, getUserTimeZone } from "@/utils/date-time";

import { useClientStore } from "@/store/clientStore";

// Map API response (snake_case) to Frontend model (camelCase)
const mapApiToProgram = (data: any): Program => {
  let logo = data.program_logo || data.company_logo || "";

  // Sanitize logo if it's the literal string "string"
  if (typeof logo === "string" && (logo === "string" || logo === "")) {
    logo = "";
  } else if (
    logo &&
    typeof logo === "string" &&
    !logo.startsWith("http") &&
    !logo.startsWith("data:")
  ) {
    // Leverage the Next.js /api rewrite proxy for consistency and CORS avoidance
    const cleanPath = logo.startsWith("/") ? logo.slice(1) : logo;
    logo = `/api/${cleanPath}`;
  }

  return {
    id: (data.id || data.program_id)?.toString() || "",
    programId: data.program_ref_id || data.program_id?.toString() || "",
    title: data.title || "",
    description: data.description || "",
    companyName: data.company_name || "",
    facilitator: data.facilitator_name || "",
    workshopDate: data.workshop_date,
    imageUrl: logo,
    meetingLink: data.meeting_link || "",
    leaderBoardType: data.leader_board_type || "",
    pi1Title: data.pi_1_title || "",
    pi2Title: data.pi_2_title || "",
    rating: data.average_rating ?? data.rating ?? null,
    ratingCount: data.rating_count,
    status: data.status || "draft",
    visibility: data.visibility || "private",
    startDate: data.start_date || "",
    endDate: data.end_date || "",
    duration: data.duration || "",
    learningEngagement:
      data.learning_engagement_avg_score != null
        ? Math.ceil(data.learning_engagement_avg_score)
        : data.learning_engagement || 0,
    learningEffectiveness:
      data.learning_effectiveness_avg_score != null
        ? Math.ceil(data.learning_effectiveness_avg_score)
        : data.learning_effectiveness || 0,
    cohortSize:
      data.license_size != null ? data.license_size : data.cohort_size || 0,
    usersJoined:
      data.license_joined != null
        ? data.license_joined
        : data.users_joined || 0,
    learningEngagementAvgScore: data.learning_engagement_avg_score,
    learningEffectivenessAvgScore: data.learning_effectiveness_avg_score,
    licenseSize: data.license_size,
    licenseJoined: data.license_joined,
    isAIGenerated: Boolean(data.is_ai_generated),
    isAIGenerating: Boolean(data.is_ai_generating),
    notificationTime: data.notification_time || "",
    notificationTimeTwo: data.notification_time_two || "",
    timeZone: data.program_timezone || data.time_zone || "",
    notificationContent: data.notification_content || "",
    notificationContentTwo: data.notification_content_two || "",
    modifiedBy: data.modified_by,
    totalContent: typeof data.total_content === "number" ? data.total_content : 0,
    contentIncludeDays: Array.isArray(data.content_include_days) ? data.content_include_days : [],
    holidays: Array.isArray(data.holidays) ? data.holidays : [],
    duplicatedFromProgramId: data.duplicated_from_program_id ?? null,
    type: data.type || data.program_type || "scheduled_learning",
    journeyImageKey: data.journey_image_id != null ? String(data.journey_image_id) : null,
    languages: Array.isArray(data.supported_languages)
      ? data.supported_languages.filter((l: string) => l !== "en")
      : [],
    translations: Array.isArray(data.translations) ? data.translations : [],
  };
};

// Map Frontend model to API payload (FormData)
const createProgramPayload = (program: any): FormData => {
  const formData = new FormData();

  // Backend expects a numeric plan_id.
  // Your auth store now provides this under `plan_id` (fall back to empty string).
  const { clientData } = useClientStore.getState();
  const rawPlanId = clientData?.plan_id;
  const planId = rawPlanId ? String(rawPlanId) : "";

  // Map program types
  let type = "scheduled_learning";
  if (program.programType === "modular") type = "modular_learning";
  else if (program.programType === "journey") type = "journey_learning";

  // Map track
  let track = "individual";
  if (program.programTrack === "cohort-scoreboard") track = "cohort_scoreboard";
  else if (program.programTrack === "cohort-leaderboard")
    track = "cohort_leaderboard";

  formData.append("title", program.programTitle || "");
  formData.append("plan_id", planId); // Required by API; from auth store (or empty string)
  formData.append("description", program.programDescription || "");
  formData.append("company_name", program.companyName || "");
  formData.append("facilitator_name", program.facilitatorName || "");
  formData.append("program_type", type);

  if (program.programType === "journey" && program.journeyImageKey) {
    formData.append("journey_image_id", program.journeyImageKey);
  }

  formData.append("pi_1_title", program.performanceIndicator1 || "");
  formData.append("pi_2_title", program.performanceIndicator2 || "");
  formData.append("meeting_link", program.meetingLink || "");
  formData.append("leader_board_type", track);
  formData.append("visibility", program.visibility || "private");
  const selectedTimeZone = program.timeZone || getUserTimeZone();
  formData.append("program_timezone", selectedTimeZone);

  // Logo File
  if (program.companyLogo) {
    formData.append("program_logo", program.companyLogo);
  }

  // Dates - format as YYYY-MM-DD (Directly from input type="date")
  if (program.startDate) {
    formData.append("start_date", program.startDate);
  }
  if (program.endDate) {
    formData.append("end_date", program.endDate);
  }

  // Notification Time (Convert {hours, minutes, ampm} to HH:MM)
  // Notification Time & Content (Handle array of notifications)
  if (
    program.notifications &&
    Array.isArray(program.notifications) &&
    program.notifications.length > 0
  ) {
    // Currently mapping only the first notification to the singular backend fields
    // TODO: Update backend to support multiple notifications
    const primaryNotification = program.notifications[0];

    formData.append("notification_content", primaryNotification.content || "");

    if (primaryNotification.time) {
      const { hours, minutes, ampm } = primaryNotification.time;
      formData.append(
        "notification_time",
        convert12HourTimeToUtcHHMM(
          {
            hours: String(hours),
            minutes: String(minutes),
            ampm: String(ampm),
          },
          selectedTimeZone,
          program.startDate,
        ),
      );
    }

    if (program.notifications.length > 1) {
      const secondaryNotification = program.notifications[1];
      formData.append("notification_content_two", secondaryNotification.content || "");
      if (secondaryNotification.time) {
        const { hours, minutes, ampm } = secondaryNotification.time;
        formData.append(
          "notification_time_two",
          convert12HourTimeToUtcHHMM(
            {
              hours: String(hours),
              minutes: String(minutes),
              ampm: String(ampm),
            },
            selectedTimeZone,
            program.startDate,
          ),
        );
      }
    }
  } else {
    // Fallback for legacy structure
    formData.append("notification_content", program.notificationContent || "");

    if (program.notificationTime) {
      const { hours, minutes, ampm } = program.notificationTime;
      formData.append(
        "notification_time",
        convert12HourTimeToUtcHHMM(
          {
            hours: String(hours),
            minutes: String(minutes),
            ampm: String(ampm),
          },
          selectedTimeZone,
          program.startDate,
        ),
      );
    }
  }

  // Multi-language support
  if (Array.isArray(program.selectedLanguages)) {
    formData.append("supported_languages", JSON.stringify(program.selectedLanguages));

    const translations = program.selectedLanguages.map((langCode: string) => {
      const t = program.languageTranslations?.[langCode] || {};
      const notifs: Array<{ content: string }> = Array.isArray(t.notifications) ? t.notifications : [];
      return {
        language_code: langCode,
        title: t.title || "",
        description: t.description || "",
        company_name: t.companyName || "",
        facilitator_name: t.facilitatorName || "",
        notification_content: notifs[0]?.content || "",
        notification_content_two: notifs[1]?.content || "",
        pi_1_title: t.performanceIndicator1 || "",
        pi_2_title: t.performanceIndicator2 || "",
      };
    });

    formData.append("translations", JSON.stringify(translations));

    // Per-language logos (sent as separate FormData fields)
    program.selectedLanguages.forEach((langCode: string) => {
      const logo = program.languageTranslations?.[langCode]?.programLogo;
      if (logo instanceof File) {
        formData.append(`program_logo_${langCode}`, logo);
      }
    });
  }

  return formData;
};

export const programsService = {
  getPrograms: async (
    searchText: string = "",
    page: number = 1,
    pageSize: number = 5,
    skipLoader: boolean = false,
    status?: Program["status"] | "all",
  ): Promise<ApiResponse<{ programs: Program[]; total: number }>> => {
    const query = new URLSearchParams();
    if (searchText) query.append("search_text", searchText);
    if (status && status !== "all") query.append("status", status);
    query.append("page", page.toString());
    query.append("page_size", pageSize.toString());

    const response = await apiClient.get<any>(
      `/client/program/list?${query.toString()}`,
      { skipLoader },
    );

    // Check if response.data contains 'programs' array
    // Check if response.data contains 'programs' array
    if (
      response.success &&
      response.data &&
      Array.isArray(response.data.programs)
    ) {
      return {
        success: true,
        data: {
          programs: response.data.programs.map(mapApiToProgram),
          total: response.data.total || response.data.programs.length,
        },
      };
    }
    // Fallback if structure is different (e.g. just array)
    if (response.success && Array.isArray(response.data)) {
      return {
        success: true,
        data: {
          programs: response.data.map(mapApiToProgram),
          total: response.data.length,
        },
      };
    }

    return {
      success: false,
      data: { programs: [], total: 0 },
      error: response.error || "Failed to fetch programs",
    };
  },

  getProgramById: async (id: string): Promise<ApiResponse<Program>> => {
    const response = await apiClient.get<any>(`/client/program/${id}`);
    if (response.success && response.data) {
      return {
        success: true,
        data: mapApiToProgram(response.data),
      };
    }
    return { success: false, data: {} as Program, error: response.error };
  },

  createProgram: async (program: any): Promise<ApiResponse<Program>> => {
    const payload = createProgramPayload(program);
    // apiClient.post sends JSON by default
    const response = await apiClient.post<any>(
      "/client/program/create",
      payload,
    );

    if (response.success && response.data) {
      return {
        success: true,
        data: mapApiToProgram(response.data),
        message: "Program created successfully",
      };
    }
    return {
      success: false,
      data: {} as Program,
      error: response.error || "Failed to create program",
    };
  },

  updateProgram: async (
    id: string,
    updates: any,
  ): Promise<ApiResponse<Program>> => {
    const payload = createProgramPayload(updates);
    const response = await apiClient.put<any>(`/client/program/${id}`, payload);
    if (response.success && response.data) {
      return {
        success: true,
        data: mapApiToProgram(response.data),
      };
    }
    return { success: false, data: {} as Program, error: response.error };
  },

  deleteProgram: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/client/program/${id}`);
  },

  publishProgram: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.post(`/client/program/${id}/publish`);
  },

  searchPrograms: async (query: string): Promise<ApiResponse<Program[]>> => {
    const response = await apiClient.get<any>("/client/program/list");
    let allPrograms: Program[] = [];

    if (
      response.success &&
      response.data &&
      Array.isArray(response.data.programs)
    ) {
      allPrograms = response.data.programs.map(mapApiToProgram);
    } else if (response.success && Array.isArray(response.data)) {
      allPrograms = response.data.map(mapApiToProgram);
    }

    if (allPrograms.length > 0) {
      const filtered = allPrograms.filter(
        (p) =>
          p.title?.toLowerCase().includes(query.toLowerCase()) ||
          p.programId?.toLowerCase().includes(query.toLowerCase()),
      );
      return { success: true, data: filtered };
    }
    return { success: false, data: [], error: response.error };
  },

  generateAccessCode: async (
    programId: string | number,
    data: any,
  ): Promise<ApiResponse<any>> => {
    return apiClient.post(
      `/client/program/${programId}/generate-access-code`,
      data,
    );
  },

  duplicateProgram: async (id: string | number): Promise<ApiResponse<any>> => {
    return apiClient.post(`/client/program/${id}/duplicate`);
  },

  duplicateWithSettings: async (
    sourceProgramId: string,
    program: any,
    copyContent: Record<string, boolean>,
    selectedDays: string[],
    excludedDates: string[],
  ): Promise<ApiResponse<Program>> => {
    const payload = createProgramPayload(program);

    // Map UI keys → API extra keys
    const EXTRAS_KEY_MAP: Record<string, string> = {
      knowledgeCard: "knowledge_card",
      goalsTemplates: "goals",
      habitsTemplates: "habits",
      resources: "resources",
      workbook: "workbook",
      quotes: "quotes",
      customPushNotification: "custom_push_notification",
      popupNotification: "popup_notification",
      certificateDesign: "certificate",
      badgesAndPoints: "badges_and_points",
      programPrivacyPolicy: "program_privacy_policy",
    };

    const includeExtras = Object.entries(copyContent)
      .filter(([, selected]) => selected)
      .map(([key]) => EXTRAS_KEY_MAP[key])
      .filter(Boolean);

    // Map day names → numbers (0=Sunday … 6=Saturday)
    const DAY_NUMBER: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    const contentIncludeDays = selectedDays
      .map((d) => DAY_NUMBER[d])
      .filter((n) => n !== undefined)
      .sort((a, b) => a - b);

    payload.append("include_extras", JSON.stringify(includeExtras));
    payload.append("content_include_days", JSON.stringify(contentIncludeDays));
    payload.append("holidays", JSON.stringify(excludedDates));

    const response = await apiClient.post<any>(
      `/client/program/${sourceProgramId}/duplicate`,
      payload,
    );

    if (response.success && response.data) {
      return { success: true, data: mapApiToProgram(response.data) };
    }
    return {
      success: false,
      data: {} as Program,
      error: response.error || "Failed to duplicate program",
    };
  },

  getPrivacyPolicy: async (id: string | number): Promise<ApiResponse<any>> => {
    const response = await apiClient.get<any>(
      `/client/program/${id}/privacy-policy`,
    );
    if (response.success && response.data) {
      return { ...response, data: response.data.policy };
    }
    return response;
  },

  updatePrivacyPolicy: async (
    id: string | number,
    data: any,
  ): Promise<ApiResponse<any>> => {
    return apiClient.post(`/client/program/${id}/privacy-policy`, data);
  },

  getLicenses: async (
    id: string | number,
    page: number = 1,
    pageSize: number = 50,
  ): Promise<ApiResponse<any>> => {
    const query = new URLSearchParams();
    query.append("page", page.toString());
    query.append("page_size", pageSize.toString());
    return apiClient.get(`/client/program/${id}/licenses?${query.toString()}`);
  },

  removeUnusedLicenses: async (
    id: string | number,
  ): Promise<ApiResponse<any>> => {
    return apiClient.delete(`/client/program/${id}/remove-unused-licenses`);
  },

  validateInviteEmails: async (
    programId: string | number,
    emails: string[],
  ): Promise<ApiResponse<{ already_invited_or_joined?: string[] }>> => {
    return apiClient.post(`/client/program/${programId}/validate-invite-emails`, { emails });
  },

  bulkInviteParticipants: async (
    programId: string | number,
    participants: Array<{
      first_name: string;
      last_name: string;
      email: string;
      phone_number: string;
    }>,
  ): Promise<ApiResponse<any>> => {
    return apiClient.post(`/client/program/${programId}/bulk-invite-participants`, { participants });
  },

  getJourneyImages: async (): Promise<ApiResponse<JourneyImage[]>> => {
    const response = await apiClient.get<any>("/client/program/journey-images");
    if (response.success && response.data) {
      const raw: any[] = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data.journey_images)
        ? response.data.journey_images
        : [];
      const images: JourneyImage[] = raw
        .filter((item) => item.status === "active")
        .map((item) => ({
          id: item.id,
          template_name: item.template_name ?? "",
          template_key: item.template_key ?? "",
          image_path: item.image_path ?? "",
        }));
      return { success: true, data: images };
    }
    return { success: false, data: [], error: response.error || "Failed to fetch journey images" };
  },
};
