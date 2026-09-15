"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import styles from "@/styles/add-content-modal.module.css";
import {
  validateMediaFileSize,
  getMediaDurationInSeconds,
  MIN_MEDIA_DURATION_SECONDS,
  MEDIA_DURATION_ERROR_MESSAGE,
} from "@/utils/content-helper";
import type { MediaPlaylistItem } from "@/components/features/content/content-builder.types";

interface AddMediaItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: MediaPlaylistItem) => void;
  /** When set, the modal edits this existing item instead of adding a new one. */
  initialData?: MediaPlaylistItem | null;
}

// Prefixed so a locally-generated id can never look like a real (numeric) server id —
// the update payload's id-based reconcile relies on that distinction.
const genId = () => `tmp_${Math.random().toString(36).substr(2, 9)}`;

/** Cap captured-frame width so the thumbnail stays lightweight, matching custom-upload sizing. */
const CAPTURED_FRAME_MAX_WIDTH = 480;

export default function AddMediaItemModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: AddMediaItemModalProps) {
  const isEditing = !!initialData;

  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | undefined>();
  // True only once the user actually picks a new thumbnail this session (scene pick or
  // custom upload) — distinct from thumbnailDataUrl, which also holds the *carried-over*
  // existing thumbnail so it can preview, so it alone can't tell "changed" from "seeded".
  const [thumbnailChanged, setThumbnailChanged] = useState(false);

  // Scene picker state (play the video and capture the paused frame as thumbnail)
  const [showScenePicker, setShowScenePicker] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const scenePickerVideoRef = useRef<HTMLVideoElement>(null);

  // Seed (or reset) state whenever the modal opens, for both add and edit mode.
  useEffect(() => {
    if (!isOpen) return;
    setFile(null);
    setShowScenePicker(false);
    setError(null);
    setThumbnailChanged(false);
    if (initialData) {
      setDuration(initialData.duration || 0);
      setThumbnailFile(null);
      setThumbnailDataUrl(initialData.thumbnail_path || initialData.thumbnailDataUrl);
    } else {
      setDuration(0);
      setThumbnailFile(null);
      setThumbnailDataUrl(undefined);
    }
  }, [isOpen, initialData]);

  // Object URLs must stay stable across re-renders — creating a new one every render
  // (as a plain inline expression would) swaps the <video> src and forces it to reload
  // from frame 0, wiping out any scrubbing/capture in progress.
  const [fileObjectUrl, setFileObjectUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setFileObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setFileObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!isOpen) return null;

  const isVideo = file ? file.type.startsWith("video") : initialData?.mediaType === "video";
  const videoSrcForScenes = fileObjectUrl || initialData?.path || initialData?.previewUrl || "";

  const resetAndClose = () => {
    setFile(null);
    setDuration(0);
    setThumbnailFile(null);
    setThumbnailDataUrl(undefined);
    setShowScenePicker(false);
    setError(null);
    setThumbnailChanged(false);
    onClose();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setError(null);

    const sizeError = validateMediaFileSize(selected);
    if (sizeError) {
      setError(sizeError);
      e.target.value = "";
      return;
    }

    const dur = await getMediaDurationInSeconds(selected);
    if (dur > 0 && dur < MIN_MEDIA_DURATION_SECONDS) {
      setError(MEDIA_DURATION_ERROR_MESSAGE);
      e.target.value = "";
      return;
    }

    setFile(selected);
    setDuration(dur);
  };

  const handleOpenScenePicker = () => {
    if (!isVideo || !videoSrcForScenes) return;
    setShowScenePicker(true);
  };

  const handleCaptureFrame = () => {
    const video = scenePickerVideoRef.current;
    if (!video) return;
    video.pause();

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;

    const scale = w > CAPTURED_FRAME_MAX_WIDTH ? CAPTURED_FRAME_MAX_WIDTH / w : 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setThumbnailFile(null);
      setThumbnailDataUrl(canvas.toDataURL("image/jpeg", 0.85));
      setThumbnailChanged(true);
      setShowScenePicker(false);
    } catch {
      setError("Could not capture this frame. Try uploading a custom thumbnail instead.");
    }
  };

  const handleSave = () => {
    if (!file && !isEditing) {
      setError("Please choose a file to upload.");
      return;
    }
    const item: MediaPlaylistItem = {
      id: initialData?.id || genId(),
      mediaType: file ? (file.type.startsWith("video") ? "video" : "audio") : initialData!.mediaType,
      file: file || initialData?.file,
      path: file ? undefined : initialData?.path,
      previewUrl: file ? URL.createObjectURL(file) : initialData?.previewUrl || initialData?.path || "",
      name: file ? file.name : initialData?.name || "",
      duration: file ? duration : initialData?.duration || 0,
      // Only report a thumbnail change when the user actually picked one this session —
      // otherwise carry the existing thumbnail_path forward untouched.
      thumbnailFile: thumbnailChanged ? thumbnailFile || undefined : undefined,
      thumbnailDataUrl: thumbnailChanged ? thumbnailDataUrl : undefined,
      thumbnail_path: thumbnailChanged ? undefined : initialData?.thumbnail_path,
      order: initialData?.order ?? 0,
    };
    onSave(item);
    resetAndClose();
  };

  return createPortal(
    <div className={styles.modalOverlay} style={{ zIndex: 100000 }}>
      <div
        className={styles.modalContainer}
        style={{ width: "560px", height: "auto", maxHeight: "90vh" }}
      >
        <div className={styles.modalHeader}>
          <div
            className={styles.modalTitle}
            style={{ color: "var(--color-primary)" }}
          >
            {isEditing ? "Edit Media" : "Add Media"}
          </div>
          <div className={styles.closeIcon} onClick={resetAndClose}>
            ✕
          </div>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.inputGroup} style={{ marginBottom: 20 }}>
            <label className={styles.commonLabel}>
              Video/Audio File
              {!isEditing && <span style={{ color: "#DC2626" }}>*</span>}
            </label>
            <div
              className={styles.fileUploadArea}
              onClick={() => fileInputRef.current?.click()}
              style={{ cursor: "pointer" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  width: "100%",
                  alignItems: "center",
                  height: "100%",
                  padding: "0 16px",
                }}
              >
                <span
                  style={{
                    color: file ? "#2563eb" : "#9CA3AF",
                    fontSize: 14,
                    flex: 1,
                    minWidth: 0,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginRight: 8,
                  }}
                >
                  {file
                    ? file.name
                    : isEditing
                      ? `Current: ${initialData?.name || "existing file"} — click to replace`
                      : "Click to browse (MP4, MOV, MP3, M4A — max 50MB)"}
                </span>
                <span className={styles.browseFileLink} style={{ flexShrink: 0 }}>
                  Browse
                </span>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept="video/*,audio/*"
              onChange={handleFileChange}
            />

            {isVideo && (
              <div style={{ marginTop: 16 }}>
                <label className={styles.commonLabel}>
                  Thumbnail{" "}
                  <span style={{ color: "#9CA3AF", fontWeight: 400 }}>
                    (Optional)
                  </span>
                </label>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <button
                    type="button"
                    className={styles.outlineBtnSmall}
                    onClick={handleOpenScenePicker}
                  >
                    Select scene from video
                  </button>
                  <button
                    type="button"
                    className={styles.outlineBtnSmall}
                    onClick={() => thumbnailInputRef.current?.click()}
                  >
                    Upload custom thumbnail
                  </button>
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setShowScenePicker(false);
                        setThumbnailFile(f);
                        setThumbnailDataUrl(URL.createObjectURL(f));
                        setThumbnailChanged(true);
                      }
                    }}
                  />
                </div>

                {showScenePicker && (
                  <div className={styles.scenePickerPanel}>
                    <video
                      ref={scenePickerVideoRef}
                      src={videoSrcForScenes}
                      className={styles.scenePickerPreview}
                      controls
                      playsInline
                      crossOrigin="anonymous"
                    />
                    <button
                      type="button"
                      className={styles.outlineBtnSmall}
                      style={{ marginTop: 10 }}
                      onClick={handleCaptureFrame}
                    >
                      Capture Frame
                    </button>
                  </div>
                )}

                {!showScenePicker && thumbnailDataUrl && (
                  <img
                    src={thumbnailDataUrl}
                    alt="Thumbnail preview"
                    className={styles.customThumbnailPreview}
                  />
                )}
              </div>
            )}
          </div>

          {error && (
            <div style={{ color: "#DC2626", fontSize: "13px", marginTop: "12px" }}>
              {error}
            </div>
          )}
        </div>

        <div
          className={styles.modalFooterCentered}
          style={{ width: "100%", boxSizing: "border-box" }}
        >
          <button className={styles.cancelBtnCentered} onClick={resetAndClose}>
            Close
          </button>
          <button className={styles.saveBtnCentered} onClick={handleSave}>
            {isEditing ? "Save Changes" : "Add Media"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
