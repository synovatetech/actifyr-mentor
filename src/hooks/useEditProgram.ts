"use client";

import { useQuery } from "@tanstack/react-query";
import { programsService } from "@/services/api/programs.service";
import { convertUtcHHMMTo12HourTime, getUserTimeZone } from "@/utils/date-time";
import { buildLanguageState } from "@/utils/program-languages";
import { programDetailKey } from "./useDuplicateProgram";

export function useEditProgram(programId: string) {
  return useQuery({
    queryKey: programDetailKey(programId),
    queryFn: async () => {
      const res = await programsService.getProgramById(programId);
      if (!res.success || !res.data) throw new Error(res.error || "Failed to load program");
      return res.data;
    },
    enabled: !!programId,
    staleTime: 0,
    select: (p) => {
      const tz = p.timeZone || getUserTimeZone();
      const notifications: { time: { hours: string; minutes: string; ampm: string }; content: string }[] = [
        {
          time: convertUtcHHMMTo12HourTime(p.notificationTime || "", tz, p.startDate),
          content: p.notificationContent || "",
        },
      ];
      if (p.notificationTimeTwo || p.notificationContentTwo) {
        notifications.push({
          time: convertUtcHHMMTo12HourTime(p.notificationTimeTwo || "", tz, p.startDate),
          content: p.notificationContentTwo || "",
        });
      }
      // Seed per-language translation state from API translations array
      const { selectedLanguages, languageTranslations } = buildLanguageState(p, notifications);

      return {
        programTitle: p.title || "",
        status: p.status,
        existingLogoUrl: p.imageUrl || "",
        programDescription: p.description || "",
        companyName: p.companyName || "",
        facilitatorName: p.facilitator || "",
        visibility: (p.visibility || "private") as "public" | "private" | "none",
        programTrack: ((p.leaderBoardType?.replace("_", "-")) || "individual") as
          | "" | "individual" | "cohort-scoreboard" | "cohort-leaderboard",
        programType: ((p.type?.split("_")[0]) || "scheduled") as
          | "" | "scheduled" | "modular" | "journey",
        journeyImageKey: p.journeyImageKey ?? null,
        startDate: p.startDate ? p.startDate.split("T")[0] : "",
        endDate: p.endDate ? p.endDate.split("T")[0] : "",
        timeZone: tz,
        notifications,
        performanceIndicator1: p.pi1Title || "Learning Engagement",
        performanceIndicator2: p.pi2Title || "Learning Effectiveness",
        meetingLink: p.meetingLink || "",
        leaderboardEnabled: true,
        selectedLanguages,
        languageTranslations,
      };
    },
  });
}
