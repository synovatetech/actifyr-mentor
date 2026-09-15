"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { programsService } from "@/services/api/programs.service";
import {
  convertUtcHHMMTo12HourTime,
  getUserTimeZone,
} from "@/utils/date-time";
import { buildLanguageState, type LangTranslation } from "@/utils/program-languages";

// ── Query keys ────────────────────────────────────────────────────────────────

export const programDetailKey = (id: string) => ["program", id] as const;

// ── Fetch source program ──────────────────────────────────────────────────────

export function useSourceProgram(programId: string) {
  return useQuery({
    queryKey: programDetailKey(programId),
    queryFn: async () => {
      const res = await programsService.getProgramById(programId);
      if (!res.success || !res.data) {
        throw new Error(res.error || "Failed to load program");
      }
      return res.data;
    },
    enabled: !!programId,
    staleTime: 1000 * 60 * 5, // 5 min — source data doesn't change during the session
    select: (p) => {
      // Transform raw Program into pre-filled form shape
      const tz = p.timeZone || getUserTimeZone();

      const primaryTime = convertUtcHHMMTo12HourTime(
        p.notificationTime || "",
        tz,
        p.startDate,
      );
      const notifications: { time: { hours: string; minutes: string; ampm: string }; content: string }[] = [
        { time: primaryTime, content: p.notificationContent || "" },
      ];
      if (p.notificationTimeTwo || p.notificationContentTwo) {
        notifications.push({
          time: convertUtcHHMMTo12HourTime(p.notificationTimeTwo || "", tz, p.startDate),
          content: p.notificationContentTwo || "",
        });
      }

      const { selectedLanguages, languageTranslations } = buildLanguageState(p, notifications);

      return {
        programTitle: `Copy of ${p.title || ""}`,
        companyLogo: null as File | null,
        existingLogoUrl: p.imageUrl || "",
        programDescription: p.description || "",
        companyName: p.companyName || "",
        facilitatorName: p.facilitator || "",
        visibility: "private" as const,
        programTrack: ((p.leaderBoardType?.replace("_", "-")) || "individual") as
          | "individual"
          | "cohort-scoreboard"
          | "cohort-leaderboard",
        programType: ((p.type?.split("_")[0]) || "scheduled") as
          | "scheduled"
          | "modular"
          | "journey",
        journeyImageKey: p.journeyImageKey ?? null,
        timeZone: tz,
        notifications,
        performanceIndicator1: p.pi1Title || "Learning Engagement",
        performanceIndicator2: p.pi2Title || "Learning Effectiveness",
        meetingLink: p.meetingLink || "",
        leaderboardEnabled: true,
        totalContent: p.totalContent || 0,
        contentIncludeDays: Array.isArray(p.contentIncludeDays) ? p.contentIncludeDays : [],
        holidays: Array.isArray(p.holidays) ? p.holidays : [],
        selectedLanguages,
        languageTranslations,
      };
    },
  });
}

// ── Duplicate mutation ────────────────────────────────────────────────────────

export interface DuplicatePayload {
  sourceProgramId: string;
  formData: {
    programTitle: string;
    companyLogo: File | null;
    programDescription: string;
    companyName: string;
    facilitatorName: string;
    visibility: "public" | "private" | "none";
    programTrack: string;
    programType: string;
    journeyImageKey: string | null;
    startDate: string;
    endDate: string;
    timeZone: string;
    notifications: { time: { hours: string; minutes: string; ampm: string }; content: string }[];
    performanceIndicator1: string;
    performanceIndicator2: string;
    meetingLink: string;
    leaderboardEnabled: boolean;
    selectedLanguages?: string[];
    languageTranslations?: Record<string, LangTranslation>;
  };
  copyContent: Record<string, boolean>;
  selectedDays: string[];
  excludedDates: string[];
}

export function useDuplicateProgramMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sourceProgramId,
      formData,
      copyContent,
      selectedDays,
      excludedDates,
    }: DuplicatePayload) =>
      programsService.duplicateWithSettings(
        sourceProgramId,
        formData,
        copyContent,
        selectedDays,
        excludedDates,
      ),
    onSuccess: () => {
      // Invalidate program list so it refreshes on the next visit
      queryClient.invalidateQueries({ queryKey: ["programs"] });
    },
  });
}
