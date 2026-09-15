"use client";

import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePersistedScroll } from "@/hooks/usePersistedScroll";
import { createPortal } from "react-dom";
import styles from "@/styles/review-script-modal.module.css";
import RichTextEditor from "@/components/common/RichTextEditor";
import {
  useAvatarGroups,
  useAvatarList,
  useVoices,
  useAudioVoices,
  type AvatarGroup,
  type AvatarItem,
  type Voice,
  type AudioVoice,
} from "@/hooks/useVideoApi";
import { aiService } from "@/services/api/ai.service";

export interface ReviewScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  script: string;
  dateLabel?: string;
  /** Called when user confirms generation. */
  onGenerate: (
    type: "video" | "audio",
    extra?: {
      avatar_id?: string;
      voice_id?: string;
      voice_name?: string;
      video_script?: string;
      audio_script?: string;
    },
  ) => Promise<void>;
  /** Called when user saves an edited script. */
  onScriptChange?: (script: string) => void;
}

type AvatarView = "groups" | "looks" | "selected";

const MAX_SCRIPT_CHARS = 2500;

const stripHtml = (html: string) =>
  String(html || "")
    .replace(/<[^>]*>?/gm, " ")
    .replace(/\s+/g, " ")
    .trim();

export default function ReviewScriptModal({
  isOpen,
  onClose,
  script,
  dateLabel,
  onGenerate,
  onScriptChange,
}: ReviewScriptModalProps) {
  const [mediaType, setMediaType] = useState<"video" | "audio">("video");
  const [avatarView, setAvatarView] = useState<AvatarView>("groups");
  const [selectedGroup, setSelectedGroup] = useState<AvatarGroup | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarItem | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [selectedAudioVoice, setSelectedAudioVoice] = useState<AudioVoice | null>(null);
  const {
    data: groupsData,
    isLoading: loadingGroups,
    isError: groupsError,
  } = useAvatarGroups();

  const {
    data: looksData,
    isLoading: loadingLooks,
    isError: looksError,
  } = useAvatarList(selectedGroup?.group_id ?? null);

  const {
    data: voicesData,
    isLoading: loadingVoices,
    isError: voicesError,
  } = useVoices();

  const {
    data: audioVoicesData,
    isLoading: loadingAudioVoices,
    isError: audioVoicesError,
  } = useAudioVoices();

  const groups = groupsData?.items ?? [];
  const looks = looksData?.items ?? [];
  const voices = voicesData?.items ?? [];
  const audioVoices = audioVoicesData?.items ?? [];

  // Auto-select first voice when voices load
  useEffect(() => {
    if (voices.length > 0 && !selectedVoice) {
      setSelectedVoice(voices[0]);
    }
  }, [voices, selectedVoice]);

  // Reset right-panel state when type changes
  useEffect(() => {
    setAvatarView("groups");
    setSelectedGroup(null);
    setSelectedAvatar(null);
  }, [mediaType]);

  const handleGroupClick = (group: AvatarGroup) => {
    setSelectedGroup(group);
    setAvatarView("looks");
  };

  const handleLookClick = (avatar: AvatarItem) => {
    setSelectedAvatar(avatar);
    setAvatarView("selected");
  };

  const handleChangeLooks = () => {
    setAvatarView("looks");
    setSelectedAvatar(null);
  };

  const handleBackToGroups = () => {
    setAvatarView("groups");
    setSelectedGroup(null);
    setSelectedAvatar(null);
  };

  // Script editing — rich text, always editable
  const [scriptHtml, setScriptHtml] = useState(script);
  const [charCount, setCharCount] = useState(() => stripHtml(script).length);
  const scriptEditedRef = useRef(false);

  useEffect(() => {
    setScriptHtml(script);
    setCharCount(stripHtml(script).length);
    scriptEditedRef.current = false;
  }, [script]);

  const handleScriptChange = (html: string) => {
    scriptEditedRef.current = true;
    setScriptHtml(html);
    setCharCount(stripHtml(html).length);
    onScriptChange?.(html);
  };

  const canCreate =
    charCount <= MAX_SCRIPT_CHARS &&
    (mediaType === "audio" ? selectedAudioVoice !== null : selectedAvatar !== null);

  const handleCreate = () => {
    onClose();
    const scriptPayload = scriptEditedRef.current ? scriptHtml : undefined;
    if (mediaType === "audio") {
      void onGenerate("audio", {
        voice_name: selectedAudioVoice?.name,
        audio_script: scriptPayload,
      });
    } else {
      void onGenerate("video", {
        avatar_id: selectedAvatar?.id,
        voice_id: selectedVoice?.voice_id,
        video_script: scriptPayload,
      });
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.dateLabel}>
            Content for <span>{dateLabel || "Selected Date"}</span>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.typeDropdownWrapper}>
              <select
                className={styles.typeDropdown}
                value={mediaType}
                onChange={(e) =>
                  setMediaType(e.target.value as "video" | "audio")
                }
              >
                <option value="video">Video</option>
                <option value="audio">Audio</option>
              </select>
            </div>
            <button
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Left: Script */}
          <div className={styles.scriptPane}>
            <div className={styles.scriptEditContainer}>
              <div className={styles.scriptEditorWrap}>
                <RichTextEditor
                  content={scriptHtml}
                  onChange={handleScriptChange}
                  showToolbar={false}
                  placeholder="Enter your script..."
                />
              </div>
              <div
                className={`${styles.charCounter} ${
                  charCount >= MAX_SCRIPT_CHARS ? styles.charCounterLimit : ""
                }`}
              >
                {charCount} / {MAX_SCRIPT_CHARS}
              </div>
            </div>
          </div>

          {/* Right: Avatar or Voice selection */}
          <div className={styles.selectionPane}>
            {mediaType === "video" ? (
              <AvatarPanel
                view={avatarView}
                groups={groups}
                looks={looks}
                selectedGroup={selectedGroup}
                selectedAvatar={selectedAvatar}
                loadingGroups={loadingGroups}
                loadingLooks={loadingLooks}
                groupsError={groupsError}
                looksError={looksError}
                voices={voices}
                selectedVoice={selectedVoice}
                onSelectVoice={setSelectedVoice}
                onGroupClick={handleGroupClick}
                onLookClick={handleLookClick}
                onChangeLooks={handleChangeLooks}
                onBackToGroups={handleBackToGroups}
              />
            ) : (
              <VoicePanel
                voices={audioVoices}
                selectedVoice={selectedAudioVoice}
                loading={loadingAudioVoices}
                error={audioVoicesError}
                onSelect={setSelectedAudioVoice}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            className={styles.cancelBtn}
            onClick={onClose}
          >
            Close
          </button>
          <button
            className={styles.createBtn}
            onClick={handleCreate}
            disabled={!canCreate}
          >
            {mediaType === "audio" ? "Create Audio" : "Create Video"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ── Sub-components ───────────────────────────────────────── */

function AvatarPanel({
  view,
  groups,
  looks,
  selectedGroup,
  selectedAvatar,
  loadingGroups,
  loadingLooks,
  groupsError,
  looksError,
  voices,
  selectedVoice,
  onSelectVoice,
  onGroupClick,
  onLookClick,
  onChangeLooks,
  onBackToGroups,
}: {
  view: AvatarView;
  groups: AvatarGroup[];
  looks: AvatarItem[];
  selectedGroup: AvatarGroup | null;
  selectedAvatar: AvatarItem | null;
  loadingGroups: boolean;
  loadingLooks: boolean;
  groupsError: boolean;
  looksError: boolean;
  voices: Voice[];
  selectedVoice: Voice | null;
  onSelectVoice: (v: Voice) => void;
  onGroupClick: (g: AvatarGroup) => void;
  onLookClick: (a: AvatarItem) => void;
  onChangeLooks: () => void;
  onBackToGroups: () => void;
}) {
  const [groupsRef, groupsOnScroll] = usePersistedScroll<HTMLDivElement>();

  if (view === "groups") {
    return (
      <>
        <div className={styles.panelHeader}>Select Avatar</div>
        <div
          className={styles.avatarGrid}
          ref={groupsRef}
          onScroll={groupsOnScroll}
        >
          {loadingGroups
            ? Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className={`${styles.skeletonCard} ${styles.skeleton}`}
                />
              ))
            : groupsError
              ? null
              : groups.map((g) => (
                  <div
                    key={g.group_id}
                    className={styles.avatarCard}
                    onClick={() => onGroupClick(g)}
                    title={g.name}
                  >
                    {g.preview_image_url ? (
                      <img
                        src={g.preview_image_url}
                        alt={g.name}
                        className={styles.avatarImage}
                      />
                    ) : (
                      <div
                        className={styles.skeleton}
                        style={{ width: "100%", height: "100%" }}
                      />
                    )}
                  </div>
                ))}
          {groupsError && (
            <div
              className={styles.errorMsg}
              style={{ gridColumn: "1 / -1" }}
            >
              Failed to load avatars
            </div>
          )}
        </div>
      </>
    );
  }

  if (view === "looks") {
    return (
      <>
        <div className={styles.panelHeader}>
          <button className={styles.backLink} onClick={onBackToGroups}>
            <span className={styles.backArrow}>←</span>
            {selectedGroup?.name ?? "Avatars"}
          </button>
        </div>
        <div className={styles.avatarGrid}>
          {loadingLooks
            ? Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className={`${styles.skeletonCard} ${styles.skeleton}`}
                />
              ))
            : looksError
              ? null
              : looks.map((a) => (
                  <div
                    key={a.id}
                    className={`${styles.avatarCard} ${
                      selectedAvatar?.id === a.id ? styles.selected : ""
                    }`}
                    onClick={() => onLookClick(a)}
                    title={a.name}
                  >
                    {a.image_url ? (
                      <img
                        src={a.image_url}
                        alt={a.name}
                        className={styles.avatarImage}
                      />
                    ) : (
                      <div
                        className={styles.skeleton}
                        style={{ width: "100%", height: "100%" }}
                      />
                    )}
                  </div>
                ))}
          {looksError && (
            <div
              className={styles.errorMsg}
              style={{ gridColumn: "1 / -1" }}
            >
              Failed to load avatar looks
            </div>
          )}
        </div>
      </>
    );
  }

  // "selected" view
  return (
    <SelectedAvatarView
      selectedAvatar={selectedAvatar}
      voices={voices}
      selectedVoice={selectedVoice}
      onSelectVoice={onSelectVoice}
      onChangeLooks={onChangeLooks}
    />
  );
}

function SelectedAvatarView({
  selectedAvatar,
  voices,
  selectedVoice,
  onSelectVoice,
  onChangeLooks,
}: {
  selectedAvatar: AvatarItem | null;
  voices: Voice[];
  selectedVoice: Voice | null;
  onSelectVoice: (v: Voice) => void;
  onChangeLooks: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  // Stop playback when selected voice changes
  useEffect(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, [selectedVoice?.voice_id]);

  const handlePlayPause = () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (!selectedVoice?.preview_audio_url) return;
      audioRef.current?.pause();
      const audio = new Audio(selectedVoice.preview_audio_url);
      audio.play();
      audio.onended = () => setIsPlaying(false);
      audioRef.current = audio;
      setIsPlaying(true);
    }
  };

  return (
    <div className={styles.selectedAvatarPane}>
      <div className={styles.selectedAvatarImageWrap}>
        {selectedAvatar?.image_url ? (
          <img
            src={selectedAvatar.image_url}
            alt={selectedAvatar.name}
            className={styles.selectedAvatarImage}
          />
        ) : (
          <div
            className={styles.skeleton}
            style={{ width: "100%", height: "100%" }}
          />
        )}
      </div>

      <div className={styles.selectedAvatarName}>
        {selectedAvatar?.name ?? ""}
      </div>

      <button className={styles.changeLooksBtn} onClick={onChangeLooks}>
        Change Looks
      </button>

      {voices.length > 0 && (
        <>
          <div className={styles.voicePickerLabel}>Voice</div>
          <div className={styles.voicePickerRow}>
            <select
              className={styles.voicePickerSelect}
              value={selectedVoice?.voice_id ?? ""}
              onChange={(e) => {
                const v = voices.find((x) => x.voice_id === e.target.value);
                if (v) onSelectVoice(v);
              }}
            >
              {voices.map((v) => (
                <option key={v.voice_id} value={v.voice_id}>
                  {v.name} ({v.language})
                </option>
              ))}
            </select>
            {selectedVoice?.preview_audio_url && (
              <button
                className={`${styles.voicePreviewBtn} ${isPlaying ? styles.voicePlaying : ""}`}
                onClick={handlePlayPause}
                aria-label={isPlaying ? "Pause preview" : "Play preview"}
              >
                {isPlaying ? (
                  <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
                    <rect x="0" y="0" width="3" height="12" rx="1" />
                    <rect x="7" y="0" width="3" height="12" rx="1" />
                  </svg>
                ) : (
                  <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
                    <path d="M0 0L10 6L0 12V0Z" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function VoicePanel({
  voices,
  selectedVoice,
  loading,
  error,
  onSelect,
}: {
  voices: AudioVoice[];
  selectedVoice: AudioVoice | null;
  loading: boolean;
  error: boolean;
  onSelect: (v: AudioVoice) => void;
}) {
  const queryClient = useQueryClient();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  // Auto-select first voice
  useEffect(() => {
    if (voices.length > 0 && !selectedVoice) {
      onSelect(voices[0]);
    }
  }, [voices, selectedVoice, onSelect]);

  const playVoice = async (v: AudioVoice) => {
    if (playingId === v.name) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    setPlayingId(null);
    setLoadingPreviewId(v.name);

    const requestId = ++requestIdRef.current;

    try {
      const url = await queryClient.fetchQuery({
        queryKey: ["audio", "preview", v.name],
        queryFn: () => aiService.previewAudioVoice(v.name),
        staleTime: Infinity,
      });

      if (requestId !== requestIdRef.current) return;

      const audio = new Audio(url);
      audio.play();
      audio.onended = () => setPlayingId(null);
      audioRef.current = audio;
      setPlayingId(v.name);
    } catch {
      // silently fail — no preview available
    } finally {
      if (requestId === requestIdRef.current) {
        setLoadingPreviewId(null);
      }
    }
  };

  const handleCardClick = (v: AudioVoice) => {
    onSelect(v);
    void playVoice(v);
  };

  const handlePlay = (e: React.MouseEvent, v: AudioVoice) => {
    e.stopPropagation();
    void playVoice(v);
  };

  return (
    <>
      <div className={styles.panelHeader}>Select Voice</div>
      <div className={styles.avatarGrid}>
        {loading
          ? Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className={`${styles.skeletonCard} ${styles.skeleton}`}
              />
            ))
          : error
            ? (
                <div className={styles.errorMsg} style={{ gridColumn: "1 / -1" }}>
                  Failed to load voices
                </div>
              )
            : voices.length === 0
              ? (
                  <div className={styles.emptyMsg} style={{ gridColumn: "1 / -1" }}>
                    No voices available
                  </div>
                )
              : voices.map((v) => (
                  <div
                    key={v.name}
                    className={`${styles.avatarCard} ${styles.voiceCard} ${
                      selectedVoice?.name === v.name ? styles.selected : ""
                    }`}
                    onClick={() => handleCardClick(v)}
                    title={v.name}
                  >
                    <div className={styles.voiceCardBg}>
                      <svg
                        className={styles.voiceCardRings}
                        viewBox="0 0 120 120"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle cx="60" cy="60" r="54" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
                        <circle cx="60" cy="60" r="42" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
                        <circle cx="60" cy="60" r="30" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
                      </svg>
                      <svg
                        width="44"
                        height="44"
                        viewBox="0 0 44 44"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M8 26v-4C8 15.373 14.373 9 22 9s14 6.373 14 13v4"
                          stroke="rgba(255,255,255,0.9)"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                        <rect x="6" y="26" width="6" height="10" rx="3" fill="rgba(255,255,255,0.9)" />
                        <rect x="32" y="26" width="6" height="10" rx="3" fill="rgba(255,255,255,0.9)" />
                      </svg>
                    </div>

                    <div className={styles.voiceCardOverlay}>
                      <div className={styles.voiceCardName}>{v.name}</div>
                      <div className={styles.voiceCardMeta}>{v.gender}</div>
                    </div>

                    <button
                      className={`${styles.voicePlayBtn} ${
                        playingId === v.name ? styles.voicePlaying : ""
                      }`}
                      onClick={(e) => handlePlay(e, v)}
                      aria-label={playingId === v.name ? "Pause" : "Play preview"}
                      disabled={loadingPreviewId === v.name}
                    >
                      {loadingPreviewId === v.name ? (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ animation: "spin 0.8s linear infinite" }}>
                          <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 24" />
                        </svg>
                      ) : playingId === v.name ? (
                        <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
                          <rect x="0" y="0" width="3" height="12" rx="1" />
                          <rect x="7" y="0" width="3" height="12" rx="1" />
                        </svg>
                      ) : (
                        <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
                          <path d="M0 0L10 6L0 12V0Z" />
                        </svg>
                      )}
                    </button>
                  </div>
                ))}
      </div>

      {/* Selected voice display */}
      {selectedVoice && (
        <div className={styles.selectedVoiceRow}>
          <div className={styles.selectedVoiceRowLabel}>Selected Voice</div>
          <div className={styles.selectedVoiceRowCard}>
            <div className={styles.selectedVoiceRowBg}>
              <svg
                viewBox="0 0 120 120"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
              >
                <circle cx="60" cy="60" r="54" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                <circle cx="60" cy="60" r="38" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
              </svg>
              <svg width="22" height="22" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: "relative", zIndex: 1 }}>
                <path
                  d="M8 26v-4C8 15.373 14.373 9 22 9s14 6.373 14 13v4"
                  stroke="rgba(255,255,255,0.95)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <rect x="6" y="26" width="6" height="10" rx="3" fill="rgba(255,255,255,0.95)" />
                <rect x="32" y="26" width="6" height="10" rx="3" fill="rgba(255,255,255,0.95)" />
              </svg>
            </div>
            <div className={styles.selectedVoiceRowInfo}>
              <div className={styles.selectedVoiceRowName}>{selectedVoice.name}</div>
              <div className={styles.selectedVoiceRowMeta}>{selectedVoice.gender}</div>
            </div>
            <button
              className={`${styles.selectedVoiceRowPlayBtn} ${
                playingId === selectedVoice.name ? styles.voicePlaying : ""
              }`}
              onClick={(e) => handlePlay(e, selectedVoice)}
              aria-label={playingId === selectedVoice.name ? "Pause" : "Play selected voice"}
              disabled={loadingPreviewId === selectedVoice.name}
            >
              {loadingPreviewId === selectedVoice.name ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ animation: "spin 0.8s linear infinite" }}>
                  <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 24" />
                </svg>
              ) : playingId === selectedVoice.name ? (
                <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
                  <rect x="0" y="0" width="3" height="12" rx="1" />
                  <rect x="7" y="0" width="3" height="12" rx="1" />
                </svg>
              ) : (
                <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
                  <path d="M2 0L12 6L2 12V0Z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
