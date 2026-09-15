/**
 * Captures a single frame from a video URL into a JPEG data URL (client-only).
 * Prefer a direct MP4 URL (e.g. `download_url`) for best compatibility; HLS may fail without MSE.
 */

export type GenerateVideoThumbnailOptions = {
  /** Seek offset in seconds (default 0.25 to avoid black first frame). */
  seekSeconds?: number;
  /** Max width; height scales proportionally. */
  maxWidth?: number;
  /** Abort after this many ms (default 20000). */
  timeoutMs?: number;
};

export async function generateVideoThumbnailDataUrl(
  videoSrc: string,
  options?: GenerateVideoThumbnailOptions,
): Promise<string | null> {
  if (typeof document === "undefined" || !videoSrc?.trim()) {
    return null;
  }

  const seekSeconds = options?.seekSeconds ?? 0.25;
  const maxWidth = options?.maxWidth ?? 480;
  const timeoutMs = options?.timeoutMs ?? 20_000;

  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.preload = "auto";
    video.crossOrigin = "anonymous";

    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      resolve(value);
    };

    const timer = window.setTimeout(() => finish(null), timeoutMs);

    const drawFrame = () => {
      try {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) {
          finish(null);
          return;
        }
        const scale = w > maxWidth ? maxWidth / w : 1;
        const cw = Math.round(w * scale);
        const ch = Math.round(h * scale);
        const canvas = document.createElement("canvas");
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          finish(null);
          return;
        }
        ctx.drawImage(video, 0, 0, cw, ch);
        finish(canvas.toDataURL("image/jpeg", 0.85));
      } catch {
        finish(null);
      }
    };

    video.onerror = () => finish(null);

    video.onloadeddata = () => {
      try {
        const dur = Number.isFinite(video.duration) ? video.duration : 0;
        const t = Math.min(
          Math.max(seekSeconds, 0),
          Math.max(dur - 0.05, 0),
        );
        video.currentTime = t;
      } catch {
        finish(null);
      }
    };

    video.onseeked = () => drawFrame();

    video.src = videoSrc;
  });
}
