import { aiService } from "@/services/api/ai.service";
import {
  extractVideoStatusFromPayload,
  isSuccessfulVideoStatus,
  isTerminalVideoStatus,
} from "@/lib/video-generation";

function unwrapStatusPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const o = raw as Record<string, unknown>;
  if (o.response && typeof o.response === "object") return o.response;
  if (o.data && typeof o.data === "object") return o.data;
  return raw;
}

const POLL_MS = 4000;

/** Polls GET generate-video/status/{id}/ until status is terminal. */
export async function pollGenerateVideoStatusUntilTerminal(
  statusPollId: string | number,
): Promise<{ success: boolean; raw: unknown }> {
  while (true) {
    const res = await aiService.getGenerateVideoStatus(statusPollId);
    if (!res.success) {
      throw new Error(
        res.error || res.message || "Could not check video status",
      );
    }
    const raw = unwrapStatusPayload(res.data);
    const st = extractVideoStatusFromPayload(raw);
    if (isTerminalVideoStatus(st)) {
      return {
        success: isSuccessfulVideoStatus(st),
        raw,
      };
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

/** URLs from GET generate-video/status (e.g. Tavus + Mux payload). */
export function extractGeneratedVideoUrlsFromStatusPayload(
  raw: unknown,
): {
  pageUrl: string | null;
  playbackUrl: string | null;
  streamUrl: string | null;
  downloadUrl: string | null;
  title: string | null;
} {
  const empty = {
    pageUrl: null,
    playbackUrl: null,
    streamUrl: null,
    downloadUrl: null,
    title: null,
  } as const;
  if (!raw || typeof raw !== "object") {
    return { ...empty };
  }
  const d = raw as Record<string, unknown>;
  const inner =
    d.data && typeof d.data === "object"
      ? (d.data as Record<string, unknown>)
      : null;

  const pageUrl =
    (typeof d.url === "string" ? d.url : null) ||
    (inner && typeof inner.url === "string" ? inner.url : null);
  const streamUrl =
    (typeof d.stream_url === "string" ? d.stream_url : null) ||
    (inner && typeof inner.stream_url === "string" ? inner.stream_url : null);
  const downloadUrl =
    (typeof d.download_url === "string" ? d.download_url : null) ||
    (inner && typeof inner.download_url === "string"
      ? inner.download_url
      : null);

  const title =
    (typeof d.video_name === "string" ? d.video_name : null) ||
    (typeof d.title === "string" ? d.title : null) ||
    (inner && typeof inner.video_name === "string" ? inner.video_name : null);

  const playbackUrl =
    downloadUrl ||
    streamUrl ||
    pageUrl ||
    (typeof d.video_s3_url === "string" ? d.video_s3_url : null) ||
    (inner && typeof inner.video_s3_url === "string"
      ? inner.video_s3_url
      : null);

  return {
    pageUrl,
    playbackUrl,
    streamUrl,
    downloadUrl,
    title,
  };
}

/** Best-effort playable/page URL from a terminal status payload. */
export function extractVideoUrlFromStatusPayload(raw: unknown): string | null {
  const u = extractGeneratedVideoUrlsFromStatusPayload(raw);
  return u.playbackUrl || u.pageUrl;
}
