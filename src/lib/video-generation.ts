/**
 * Helpers for async video generation (POST + status polling).
 * Status strings are normalized case-insensitively.
 */

const TERMINAL_SUCCESS = new Set([
  "completed",
  "complete",
  "success",
  "done",
  "succeeded",
  "ready",
]);

const TERMINAL_FAILURE = new Set([
  "failed",
  "error",
  "cancelled",
  "canceled",
]);

export function normalizeVideoStatus(
  raw: unknown,
): string | null | undefined {
  if (raw == null) return raw as null | undefined;
  return String(raw).trim();
}

export function isTerminalVideoStatus(status: unknown): boolean {
  const s = normalizeVideoStatus(status);
  if (!s) return false;
  const lower = s.toLowerCase();
  return TERMINAL_SUCCESS.has(lower) || TERMINAL_FAILURE.has(lower);
}

export function isSuccessfulVideoStatus(status: unknown): boolean {
  const s = normalizeVideoStatus(status);
  if (!s) return false;
  return TERMINAL_SUCCESS.has(s.toLowerCase());
}

export function isFailedVideoStatus(status: unknown): boolean {
  const s = normalizeVideoStatus(status);
  if (!s) return false;
  return TERMINAL_FAILURE.has(s.toLowerCase());
}

/**
 * Whether we should keep polling: have a job id and status is not terminal.
 * If status is missing but video_id exists, treat as in progress.
 */
export function shouldPollVideoJob(
  videoId: unknown,
  videoStatus: unknown,
): boolean {
  if (videoId == null || videoId === "") return false;
  if (isTerminalVideoStatus(videoStatus)) return false;
  return true;
}

export function extractVideoIdFromPayload(data: unknown): string | null {
  if (!data) return null;
  if (typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const direct = d.video_id ?? d.videoId ?? d.id;
  if (direct != null && direct !== "") return String(direct);
  if (d.data && typeof d.data === "object") {
    return extractVideoIdFromPayload(d.data);
  }
  return null;
}

/**
 * Generate-video POST returns `video_id`; status is checked with that id
 * (GET .../generate-video/status/{video_id}/).
 */
export function extractStatusPollIdFromGenerateVideoResponse(
  data: unknown,
): string | null {
  if (!data) return null;
  if (typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const direct =
    d.video_id ??
    d.videoId ??
    d.program_content_id ??
    d.programContentId ??
    d.id;
  if (direct != null && String(direct).trim() !== "") {
    return String(direct);
  }
  if (d.data && typeof d.data === "object") {
    return extractStatusPollIdFromGenerateVideoResponse(d.data);
  }
  return null;
}

export function extractVideoStatusFromPayload(data: unknown): string | null | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as Record<string, unknown>;
  const inner = d.data && typeof d.data === "object" ? (d.data as Record<string, unknown>) : null;
  return (d.video_status ??
    d.videoStatus ??
    d.status ??
    inner?.video_status ??
    inner?.status) as string | null | undefined;
}
