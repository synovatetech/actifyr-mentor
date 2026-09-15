"use client";

import { useQueries, type Query } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { aiService } from "@/services/api/ai.service";
import {
  extractVideoStatusFromPayload,
  isSuccessfulVideoStatus,
  isTerminalVideoStatus,
  shouldPollVideoJob,
} from "@/lib/video-generation";

export type VideoPollJob = { contentId: string; videoId: string };

const POLL_MS = 4000;

function unwrapStatusPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const o = raw as Record<string, unknown>;
  if (o.response && typeof o.response === "object") return o.response;
  if (o.data && typeof o.data === "object") return o.data;
  return raw;
}

export function useVideoGenerationPolling(
  jobs: VideoPollJob[],
  options: {
    enabled?: boolean;
    onTerminal?: (payload: {
      contentId: string;
      videoId: string;
      success: boolean;
      raw: unknown;
    }) => void;
  } = {},
) {
  const { enabled = true, onTerminal } = options;
  const completedRef = useRef<Set<string>>(new Set());

  const uniqueJobs = useMemo(() => {
    const seen = new Set<string>();
    const out: VideoPollJob[] = [];
    for (const j of jobs) {
      if (!j.videoId || seen.has(j.videoId)) continue;
      seen.add(j.videoId);
      out.push(j);
    }
    return out;
  }, [jobs]);

  const results = useQueries({
    queries: uniqueJobs.map(({ videoId, contentId }) => ({
      queryKey: ["generate-video-status", videoId] as const,
      queryFn: async () => {
        const res = await aiService.getGenerateVideoStatus(videoId);
        if (!res.success) {
          throw new Error(res.error || res.message || "Status request failed");
        }
        const payload = unwrapStatusPayload(res.data);
        return { contentId, videoId, payload };
      },
      enabled: enabled && !!videoId,
      retry: false,
      refetchInterval: (
        q: Query<
          { contentId: string; videoId: string; payload: unknown },
          Error
        >,
      ) => {
        if (q.state.error) return false;
        const p = q.state.data?.payload;
        const st = extractVideoStatusFromPayload(p);
        if (isTerminalVideoStatus(st)) return false;
        return POLL_MS;
      },
    })),
  });

  useEffect(() => {
    if (!onTerminal || !enabled) return;
    for (let i = 0; i < results.length; i++) {
      const q = results[i];
      const job = uniqueJobs[i];
      if (!q.data || !job) continue;
      const st = extractVideoStatusFromPayload(q.data.payload);
      if (!isTerminalVideoStatus(st)) continue;
      if (completedRef.current.has(job.videoId)) continue;
      completedRef.current.add(job.videoId);
      onTerminal({
        contentId: job.contentId,
        videoId: job.videoId,
        success: isSuccessfulVideoStatus(st),
        raw: q.data.payload,
      });
    }
  }, [results, uniqueJobs, onTerminal, enabled]);

  return { queries: results, jobs: uniqueJobs };
}

/**
 * At most one poll job: the content row currently open in the modal.
 * No status id (`video_id`, fallback `program_content_id`) → no polling.
 * Poll stop condition is derived only from GET status API responses.
 */
export function buildVideoPollJobForModalSelection(
  modalOpen: boolean,
  selectedContentId: string | number | null | undefined,
  editing: unknown,
  scheduledItems: unknown[],
  localByContentId: Record<string, string>,
): VideoPollJob[] {
  if (!modalOpen || selectedContentId == null || selectedContentId === "") {
    return [];
  }
  const cidStr = String(selectedContentId);
  if (!cidStr) return [];

  const edit =
    editing && typeof editing === "object"
      ? (editing as Record<string, unknown>)
      : null;

  const row = scheduledItems.find((raw) => {
    if (!raw || typeof raw !== "object") return false;
    const o = raw as Record<string, unknown>;
    return String(o.content_id ?? o.id) === cidStr;
  }) as Record<string, unknown> | undefined;

  const videoFromEditing =
    edit?.video_id ??
    edit?.videoId ??
    edit?.program_content_id ??
    edit?.programContentId;
  const videoFromRow =
    row?.video_id ??
    row?.videoId ??
    row?.program_content_id ??
    row?.programContentId;

  const pickNonEmpty = (...values: unknown[]) =>
    values.find((v) => v != null && String(v).trim() !== "");

  // Prefer modal prop data first (editing), then scheduled row fallback.
  const videoId = pickNonEmpty(videoFromEditing, videoFromRow);
  if (videoId == null || String(videoId).trim() === "") {
    return [];
  }

  // Skip polling when the status is already terminal (success or error).
  const videoStatus =
    edit?.video_status ?? edit?.videoStatus ?? row?.video_status ?? row?.videoStatus;
  if (isTerminalVideoStatus(videoStatus)) {
    return [];
  }

  return [{ contentId: cidStr, videoId: String(videoId) }];
}

export function toastMessageForTerminalFailure(raw: unknown): string {
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const msg = o.message ?? o.error ?? o.detail;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return "Video generation failed.";
}
