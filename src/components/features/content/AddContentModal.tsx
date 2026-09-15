"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import styles from "@/styles/add-content-modal.module.css";
import SharedContentForm, {
  Resource,
  Task,
  Questionnaire,
  MediaItem,
  type GeneratedMediaEntry,
} from "@/components/features/content/SharedContentForm";
import ConfirmCloseModal from "@/components/common/ConfirmCloseModal";
import ReviewScriptModal from "@/components/features/content/ReviewScriptModal";
import { aiService } from "@/services/api/ai.service";
import { useToast } from "@/context/ToastContext";
import {
  useGenerateAudio,
  useGenerateVideo,
  useGenerateVideoWithAvatar,
  useRegenerateContent,
} from "@/hooks/useContentGeneration";
import { buildContentTranslationFormData, getMissingTranslationSections, normalizeContentData } from "@/utils/content-helper";
import { contentService } from "@/services/api/content.service";
import {
  extractStatusPollIdFromGenerateVideoResponse,
  extractVideoStatusFromPayload,
  isSuccessfulVideoStatus,
  isTerminalVideoStatus,
} from "@/lib/video-generation";
import {
  extractGeneratedVideoUrlsFromStatusPayload,
  pollGenerateVideoStatusUntilTerminal,
} from "@/lib/poll-generate-video-status";
import { generateVideoThumbnailDataUrl } from "@/utils/generate-video-thumbnail";
import { toastMessageForTerminalFailure } from "@/hooks/useVideoGenerationPolling";
import {
  downloadContentUploadTemplate,
  parseContentUploadTemplate,
} from "@/utils/content-upload-template";
import { isValidMicroAction } from "@/utils/task-options";
import type { DaywiseContentItem } from "@/components/features/content/content.types";
import LanguageContentTab, { type LangTabData } from "@/components/features/content/LanguageContentTab";
import langStyles from "@/styles/lang-content-tab.module.css";
import { useContentMissingTranslations, missingTranslationsKeys } from "@/hooks/useMissingTranslations";
import { useAvailableLanguages } from "@/hooks/useAvailableLanguages";
import { MissingTranslationIcon } from "@/components/common/icons/MissingTranslationIcon";
import LiveMultiLangContentBuilder from "@/components/features/content/builder/LiveMultiLangContentBuilder";
import AddComponentPicker from "@/components/features/content/builder/AddComponentPicker";
import type { ContentBlockType } from "@/components/features/content/content-builder.types";
import { useContentBuilderController } from "@/hooks/useContentBuilderController";
import { contentBuilderKeys } from "@/hooks/useContentBuilder";
import { contentBuilderService } from "@/services/api/contentBuilder.service";
import { buildContentShellDateTime } from "@/utils/content-builder-payload";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import {
  convertUtcHHMMTo12HourTime,
  getUserTimeZone,
} from "@/utils/date-time";

dayjs.extend(utc);

// ── Pure helpers (outside component to avoid recreating on every render) ──────

/** Returns true only when a video job is in a non-terminal in-progress state. */
function getIsVideoGenerating(data: DaywiseContentItem | null): boolean {
  if (!data) return false;
  const videoId = data.video_id;
  if (!videoId) return false;
  return !isTerminalVideoStatus(data.video_status);
}

/** Infer media type from a URL's file extension. */
function inferMediaType(url: string): "video" | "audio" {
  if (/\.(mp3|wav|aac|m4a|ogg|flac)(\?|$)/i.test(url)) return "audio";
  return "video";
}

/** Extract HH:MM from a UTC datetime string or bare time string. */
function extractUtcTimeHHMM(value?: string | null): string {
  const raw = String(value || "").trim().replace(/Z$/i, "");
  if (!raw) return "";
  const timePart = raw.includes("T")
    ? raw.split("T")[1] ?? ""
    : raw.includes(" ")
      ? raw.split(" ")[1] ?? ""
      : raw;
  const parts = timePart.split(":");
  return `${parts[0] || "00"}:${(parts[1] || "00").slice(0, 2)}`;
}

/** Strip HTML tags and collapse whitespace to plain text. */
function extractPlainText(html: string): string {
  return String(html || "")
    .replace(/<[^>]*>?/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────

interface AddContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void | Promise<void>;
  onDelete?: (contentId: string) => void;
  /** Called once after video generation is kicked off; use to refresh daywise list. */
  onVideoGenerationStarted?: (payload: {
    programContentId: string | number;
    statusPollId: string;
  }) => void;
  dateLabel?: string;
  /** The actual calendar day being edited — `dateLabel` is only a display string. Required for the Content Builder path (`!isAI`) to save a content shell. */
  selectedDate?: Date;
  initialData?: DaywiseContentItem;
  isLoading?: boolean;
  isPastDate?: boolean;
  programMeetingLink?: string;
  programTimezone?: string;
  programId?: string | number;
  isTrial?: boolean;
  /** Language IDs selected during program creation (e.g. ["hi", "ml"]). */
  selectedLanguages?: string[];
  /** True when this content's date is the program's very first day — there's no previous content it could link to. */
  isFirstProgramDay?: boolean;
}

export default function AddContentModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  onVideoGenerationStarted,
  dateLabel,
  selectedDate,
  initialData,
  isLoading,
  isPastDate = false,
  programMeetingLink = "",
  programTimezone,
  programId,
  isTrial = false,
  selectedLanguages,
  isFirstProgramDay = false,
}: AddContentModalProps) {
  // AI-generated content keeps the legacy SharedContentForm + translate-API flow
  // below untouched. Manual (non-AI) content uses the new block-based Content
  // Builder, backed for real by the Content Builder API.
  const isAI =
    Boolean(initialData?.is_ai_generated) &&
    (initialData?.review_status === "pending" ||
      initialData?.status === "draft" ||
      !initialData?.status);

  // `isPastDate` is meant to stop *creating new* content on a date that's already
  // gone — it should never lock *editing* content that already exists there. The
  // planner's day-click handler already refuses to open this modal for a past date
  // with no content, so `isPastDate` is only ever true here when editing something
  // that already exists — meaning a blanket `disabled={isPastDate}` would lock every
  // already-published (past-dated) content out of editing entirely.
  const disableForPastDate = isPastDate && !initialData;

  const builderController = useContentBuilderController({ programId });
  const builderInitializedRef = useRef(false);
  const savedShellSnapshotRef = useRef<{
    hour: string;
    minute: string;
    ampm: string;
    isLinked: boolean;
    title: string;
  } | null>(null);

  useEffect(() => {
    if (isAI) return;
    if (!isOpen) {
      builderInitializedRef.current = false;
      savedShellSnapshotRef.current = null;
      return;
    }
    if (builderInitializedRef.current) return;
    builderInitializedRef.current = true;
    if (initialData && (initialData as any).components) {
      const data = initialData as any;
      builderController.hydrateFromServer(data);

      // Seed the "last saved" snapshot from the raw server data (not from `hour`/
      // `minute`/`ampm`/`builderController.title` state, which won't reflect this
      // same hydration until next render) — otherwise every edit-mode open starts
      // with a null snapshot, `builderIsDirty` reads as true unconditionally, and
      // closing without changing anything wrongly asks to confirm discarding them.
      const localTimeZone = programTimezone || getUserTimeZone();
      const referenceDate = String(data.date || "").slice(0, 10);
      const parsedTime = convertUtcHHMMTo12HourTime(
        extractUtcTimeHHMM(data.time),
        localTimeZone,
        referenceDate,
      );
      savedShellSnapshotRef.current = {
        hour: String(parseInt(parsedTime.hours, 10)),
        minute: parsedTime.minutes,
        ampm: parsedTime.ampm,
        isLinked: data.link_to_previous_content === true || data.link_to_previous_content === "true",
        title: data.title || "",
      };
    } else {
      builderController.reset();
      savedShellSnapshotRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData, isAI]);

  // Active language tab: "en" or a language id like "hi", "ml"
  const [activeLangTab, setActiveLangTab] = useState("en");
  // Per-language tab data (media, questions, tasks)
  const [langTabData, setLangTabData] = useState<Record<string, LangTabData>>({});
  // Tracks which language's translation is currently being saved (per-tab dynamic Save button).
  const [translatingLang, setTranslatingLang] = useState<string | null>(null);
  // Bumped per-language after a successful translation save, to force LanguageContentTab
  // to re-apply the freshly persisted data (real ids for new media/tasks/questions).
  const [translationRefreshTick, setTranslationRefreshTick] = useState<Record<string, number>>({});

  const { availableLanguages } = useAvailableLanguages();
  const activeLangTabs = availableLanguages.filter(
    (lang) =>
      !selectedLanguages ||
      selectedLanguages.includes(lang.id),
  );

  // Only relevant when editing existing content — a new item has no id to check yet.
  // Only fetched for the legacy AI-generated flow: the Content Builder flow (!isAI)
  // already gets its missing-translation status from LiveMultiLangContentBuilder's
  // own `useContentBuilderMissingTranslations` call, so firing this too would hit
  // both missing-translations endpoints for the same content id.
  const contentIdForTranslationStatus = initialData?.id ?? initialData?.content_id;
  const { data: missingTranslations } = useContentMissingTranslations(
    contentIdForTranslationStatus,
    isAI && isOpen && !!contentIdForTranslationStatus,
  );
  const queryClient = useQueryClient();
  const refetchMissingTranslations = () => {
    if (contentIdForTranslationStatus) {
      queryClient.invalidateQueries({
        queryKey: missingTranslationsKeys.content(contentIdForTranslationStatus),
      });
    }
  };
  // Any save that could change translation completeness bypasses the planner's own save
  // mutation (which is what normally triggers its calendar refetch), so it needs its own
  // background refetch here to clear/show the day cell's "missing translation" badge.
  const refreshCalendarInBackground = () => {
    if (programId) queryClient.invalidateQueries({ queryKey: ["scheduled-content", programId] });
  };

  const defaultLangTabData = (): LangTabData => ({
    title: "",
    content: "",
    mediaItems: [],
    questionnaires: [],
    taskDescriptions: [],
    resourceLabels: [],
  });

  const updateLangTabData = (langId: string, updates: Partial<LangTabData>) => {
    setLangTabData((prev) => {
      const existing = prev[langId] ?? defaultLangTabData();
      return { ...prev, [langId]: { ...existing, ...updates } };
    });
  };

  const getLangTabData = (langId: string): LangTabData =>
    langTabData[langId] ?? defaultLangTabData();
  const [mounted, setMounted] = useState(false);
  const { showToast } = useToast();

  const generateAudioMutation = useGenerateAudio();
  const generateVideoMutation = useGenerateVideo();
  const generateVideoWithAvatarMutation = useGenerateVideoWithAvatar();
  const regenerateContentMutation = useRegenerateContent();

  // Core Fields
  const [isLinked, setIsLinked] = useState(
    initialData?._isLocalDraft ? !!(initialData as any).link_to_previous_content : false,
  );
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [videoScript, setVideoScript] = useState("");
  const [generatedMedia, setGeneratedMedia] = useState<GeneratedMediaEntry[]>(
    [],
  );
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isImportingCsv, setIsImportingCsv] = useState(false);

  // Time
  const [hour, setHour] = useState(initialData?._isLocalDraft ? (initialData as any).hour || "10" : "10");
  const [minute, setMinute] = useState(initialData?._isLocalDraft ? (initialData as any).minute || "00" : "00");
  const [ampm, setAmpm] = useState(initialData?._isLocalDraft ? (initialData as any).ampm || "AM" : "AM");
  const [timeZone, setTimeZone] = useState(getUserTimeZone());

  // Resources
  const [resources, setResources] = useState<Resource[]>([]);

  // Media
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);

  // Tasks & Questionnaires
  const [tasks, setTasks] = useState<Task[]>([]);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(
    null,
  );
  const [meetingEnabled, setMeetingEnabled] = useState(false);
  const [meetingLink, setMeetingLink] = useState("");
  const [meetingHour, setMeetingHour] = useState("10");
  const [meetingMinute, setMeetingMinute] = useState("00");
  const [meetingAmPm, setMeetingAmPm] = useState("AM");

  // UI States
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const normalizedInitialRef = useRef<any>(null);
  // Last-saved snapshot per translation language, used the same way as
  // normalizedInitialRef but for non-English tabs (keyed by langId).
  const langBaselineRef = useRef<Record<string, Partial<LangTabData>>>({});
  // Tracks whether the modal is currently open; used to distinguish initial open
  // from subsequent initialData refreshes (planner polling) so we don't wipe
  // generatedMedia that onGenerate already populated.
  const isCurrentlyOpenRef = useRef(false);
  // Which tab the admin tried to switch to while the current tab had unsaved changes.
  const [pendingTabSwitch, setPendingTabSwitch] = useState<string | null>(null);
  const [isSwitchSaving, setIsSwitchSaving] = useState(false);


  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset or Load Data
  useEffect(() => {
    if (!isOpen) {
      // Reset the open-tracking ref so the next open is treated as a fresh load
      isCurrentlyOpenRef.current = false;
      setActiveLangTab("en");
      setLangTabData({});
      langBaselineRef.current = {};
      setPendingTabSwitch(null);
      return;
    }

    const isInitialOpen = !isCurrentlyOpenRef.current;
    isCurrentlyOpenRef.current = true;

    if (initialData) {
      const data = normalizeContentData(initialData);
      if (!data) return;

        const normalizedTitle = data.title || "";
        const normalizedContent = data.content || "";
        const normalizedResources = data.resources || [];
        const normalizedMediaItems = data.mediaItems || [];
        const normalizedTasks = data.tasks || [];
        const normalizedQuestionnaires = data.questionnaires || [];
        const localTimeZone = programTimezone || getUserTimeZone();
        const referenceDate = String(data.date || "").slice(0, 10);

        normalizedInitialRef.current = {
          title: normalizedTitle,
          content: normalizedContent,
          mediaItems: normalizedMediaItems,
          tasks: normalizedTasks,
          questionnaires: normalizedQuestionnaires,
        };

        setTitle(normalizedTitle);
        setContent(normalizedContent);
        setIsLinked(
          data.link_to_previous_content === "true" ||
            data.link_to_previous_content === true,
        );

        setTimeZone(localTimeZone);

        // Parse Time — convert backend UTC to user local timezone
        if (data.time) {
          const parsedTime = convertUtcHHMMTo12HourTime(
            extractUtcTimeHHMM(data.time),
            localTimeZone,
            referenceDate,
          );
          setHour(String(parseInt(parsedTime.hours, 10)));
          setMinute(parsedTime.minutes);
          setAmpm(parsedTime.ampm);
        }

        if (data.meet_time) {
          const parsedMeetTime = convertUtcHHMMTo12HourTime(
            extractUtcTimeHHMM(data.meet_time),
            localTimeZone,
            referenceDate,
          );
          setMeetingHour(parsedMeetTime.hours);
          setMeetingMinute(parsedMeetTime.minutes);
          setMeetingAmPm(parsedMeetTime.ampm);
        } else {
          setMeetingHour("10");
          setMeetingMinute("00");
          setMeetingAmPm("AM");
        }

        setMeetingEnabled(
          data.meet_available === true || data.meet_available === "true",
        );
        setMeetingLink(
          data.meet_link || data.meeting_link || programMeetingLink || "",
        );

        setResources(normalizedResources);
        setMediaItems(normalizedMediaItems);
        setTasks(normalizedTasks);
        setQuestionnaires(normalizedQuestionnaires);
        setVideoScript(data.video_script || "");
        setIsGeneratingVideo(getIsVideoGenerating(data as DaywiseContentItem));

        // Only reset generatedMedia on the initial open.
        // While the modal is open, the planner may refresh initialData (e.g. video_status
        // polling), which creates a new object reference and re-runs this effect.
        // Resetting generatedMedia here would wipe any video that onGenerate just set,
        // because the scheduled-content list API doesn't carry ai_media_files_links.
        if (isInitialOpen) {
          const aiLinks = Array.isArray(data.ai_media_files_links)
            ? data.ai_media_files_links
            : [];
          setGeneratedMedia(
            aiLinks
              .map((item: any) => {
                const mediaUrl = item?.url || item?.file_path || item?.path || "";
                if (!mediaUrl) return null;
                const t =
                  item?.type === "audio" || item?.type === "video"
                    ? item.type
                    : inferMediaType(mediaUrl);
                const entry: GeneratedMediaEntry = {
                  url: mediaUrl,
                  title: item?.title || undefined,
                  type: t,
                };
                if (t === "video") {
                  const pu = item?.playback_url || item?.playbackUrl;
                  const th = item?.thumbnail_url || item?.thumbnailUrl;
                  if (pu) entry.playbackUrl = pu;
                  if (th) entry.thumbnailUrl = th;
                }
                return entry;
              })
              .filter(Boolean) as GeneratedMediaEntry[],
          );
        }
    } else {
      if (isInitialOpen) {
        normalizedInitialRef.current = null;
        setIsLinked(false);
        setTitle("");
        setContent("");
        setVideoScript("");
        setGeneratedMedia([]);
        setIsGeneratingVideo(false);
        setTimeZone(programTimezone || getUserTimeZone());
        setResources([
          {
            type: "file",
            label: "",
            value: "",
            resource_from: "content",
            is_downloadable: false,
            addToResourcesPage: false,
          },
        ]);
        setHour("6");
        setMinute("00");
        setAmpm("AM");
        setMeetingEnabled(false);
        setMeetingLink(programMeetingLink || "");
        setMeetingHour("10");
        setMeetingMinute("00");
        setMeetingAmPm("AM");
        setMediaItems([]);
        setTasks([]);
        setQuestionnaires([]);
      }
    }
  }, [isOpen, initialData, programMeetingLink, programTimezone]);

  // Poll video generation status using TanStack Query — shares cache with the
  // planner-level useVideoGenerationPolling (same query key) to avoid duplicate
  // API calls. When video_status in initialData is already terminal we use
  // staleTime:Infinity so the planner's cached result is reused with no extra
  // API call. Only non-terminal statuses trigger the 4-second polling loop.
  const openVideoId = isOpen
    ? (initialData?.video_id ?? (initialData as any)?.videoId ?? null)
    : null;

  const initialStatusIsTerminal = isTerminalVideoStatus(initialData?.video_status);

  const { data: videoStatusPayload } = useQuery({
    queryKey: ["generate-video-status", openVideoId],
    queryFn: async () => {
      const res = await aiService.getGenerateVideoStatus(String(openVideoId!));
      if (!res.success) throw new Error(res.error || "Status request failed");
      return (res.data as any)?.response ?? res.data;
    },
    enabled: !!openVideoId,
    staleTime: initialStatusIsTerminal ? Infinity : 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      // Stop if the request itself errored (network/API failure).
      if (query.state.error) return false;
      const st = extractVideoStatusFromPayload(query.state.data);
      return isTerminalVideoStatus(st) ? false : 4000;
    },
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!videoStatusPayload) return;
    const st = extractVideoStatusFromPayload(videoStatusPayload);
    setIsGeneratingVideo(!isTerminalVideoStatus(st));
    if (!isSuccessfulVideoStatus(st)) return;
    const urls = extractGeneratedVideoUrlsFromStatusPayload(videoStatusPayload);
    const primaryUrl = urls.pageUrl || urls.playbackUrl || "";
    const playback = urls.playbackUrl || urls.pageUrl || "";
    if (!primaryUrl && !playback) return;
    const thumbSource = urls.downloadUrl || urls.playbackUrl || null;
    void (thumbSource
      ? generateVideoThumbnailDataUrl(thumbSource)
      : Promise.resolve(undefined)
    ).then((thumbnailUrl) => {
      setGeneratedMedia((prev) => {
        const nextVideo: GeneratedMediaEntry = {
          url: primaryUrl || playback,
          playbackUrl: playback || undefined,
          type: "video" as const,
          title: urls.title || undefined,
          thumbnailUrl: thumbnailUrl || undefined,
        };
        return [...prev.filter((m) => m.type !== "video"), nextVideo];
      });
    });
  }, [videoStatusPayload]);

  const handleSave = (): boolean => {
    if (!title.trim()) {
      showToast("Title is required.", "error");
      return false;
    }
    if (!extractPlainText(content)) {
      showToast("Content is required.", "error");
      return false;
    }
    const taskWithInvalidAction = tasks.find((t) =>
      (t.action || []).some((a) => !isValidMicroAction(a)),
    );
    if (taskWithInvalidAction) {
      const invalid = taskWithInvalidAction.action.find((a) => !isValidMicroAction(a));
      showToast(
        `Task "${taskWithInvalidAction.title || "Untitled"}" has an unsupported micro-action ("${invalid}"). Open the task and remove it before saving.`,
        "error",
      );
      return false;
    }

    const timeStr = `${hour.toString().padStart(2, "0")}:${minute} ${ampm}`;

    const itemData: Record<string, any> = {
      id: initialData?.id || initialData?.content_id,
      status: initialData?.status,
      title,
      content,
      time: timeStr,
      link_to_previous_content: isLinked,
      content_status: "active",
      resources,
      mediaItems,
      tasks,
      questionnaires,
      meet_available: meetingEnabled,
      meet_link: meetingLink,
      meet_time: `${meetingHour}:${meetingMinute} ${meetingAmPm}`,
      timeZone,
      is_ai_generated: initialData?.is_ai_generated || false,
      review_status: initialData?.review_status,
    };

    if (generatedMedia.length > 0) {
      itemData.ai_media_files_links = generatedMedia.map((m) => ({
        title: m.title || null,
        // Keep submit URL consistent with the URL used for video rendering.
        url: m.type === "video" ? m.playbackUrl || m.url : m.url,
      }));
    }

    // With other languages to fill in, keep the modal open after saving English
    // so the admin can switch tabs without having to reopen it.
    itemData.keepModalOpen = activeLangTabs.length > 0;

    onSave(itemData);
    refetchMissingTranslations();
    // Move the "last saved" baseline forward so a later tab-switch/close doesn't
    // treat this just-saved state as unsaved.
    normalizedInitialRef.current = { title, content, mediaItems, tasks, questionnaires };
    return true;
  };

  const handleConfirm = () => {
    const hasScript = extractPlainText(videoScript).length > 0;
    const hasGeneratedAudioOrVideo = generatedMedia.length > 0;

    if (hasScript && !hasGeneratedAudioOrVideo) {
      showToast(
        "Generate audio/video before approving content with a script.",
        "error",
      );
      return;
    }

    handleSave();
  };

  const handleSaveTranslation = async (langId: string): Promise<boolean> => {
    const contentId = initialData?.id ?? initialData?.content_id;
    if (!contentId) {
      showToast("Save the English content first before adding translations.", "error");
      return false;
    }

    const langData = getLangTabData(langId);
    const langName = availableLanguages.find((l) => l.id === langId)?.name || langId;
    const missingSections = getMissingTranslationSections(langData, title, content, tasks, questionnaires);
    if (missingSections.length > 0) {
      showToast(`Please fill in ${missingSections.join(", ")} for ${langName} before saving.`, "error");
      return false;
    }

    const translationFormData = buildContentTranslationFormData(
      langId,
      langData,
      questionnaires,
      tasks,
      mediaItems,
      resources,
    );
    if (!translationFormData) {
      showToast("Add some translated content before saving.", "error");
      return false;
    }

    setTranslatingLang(langId);
    try {
      const res = await contentService.translate(contentId, translationFormData);
      if (res.success) {
        showToast(`${langName} translation saved successfully`, "success");
        refetchMissingTranslations();
        refreshCalendarInBackground();
        // Recall this language's own content-detail data so the tab reflects
        // the backend-confirmed state (real ids for new media/tasks/questions).
        queryClient.invalidateQueries({ queryKey: ["lang-content", langId, programId, contentId] });
        setTranslationRefreshTick((prev) => ({ ...prev, [langId]: (prev[langId] ?? 0) + 1 }));
        // Move this language's "last saved" baseline forward.
        langBaselineRef.current[langId] = langData;
        return true;
      }
      showToast(res.error || res.message || "Failed to save translation", "error");
      return false;
    } catch (error) {
      console.error("Error saving translation:", error);
      showToast("An error occurred while saving translation", "error");
      return false;
    } finally {
      setTranslatingLang(null);
    }
  };

  // Ordered tab sequence (English first, then each configured language) — drives
  // "Save & Next"/"Save & Close" so the last tab collapses to a single CTA.
  const tabSequence = ["en", ...activeLangTabs.map((lang) => lang.id)];
  const currentTabIdx = tabSequence.indexOf(activeLangTab);
  const isLastTab = currentTabIdx === tabSequence.length - 1;
  const nextTabId = !isLastTab ? tabSequence[currentTabIdx + 1] : null;

  const handleSaveAndNext = () => {
    if (handleSave() && nextTabId) {
      setActiveLangTab(nextTabId);
    }
  };

  const handleSaveTranslationAndNext = async (langId: string) => {
    if ((await handleSaveTranslation(langId)) && nextTabId) {
      setActiveLangTab(nextTabId);
    }
  };

  const handleSaveTranslationAndClose = async (langId: string) => {
    if (await handleSaveTranslation(langId)) {
      onClose();
    }
  };

  const cleanTextForCompare = (html: string) =>
    (html || "").replace(/<[^>]*>?/gm, "").replace(/\s+/g, "").trim();

  const isEnglishDirty = (): boolean => {
    const orig = normalizedInitialRef.current;
    if (!orig) {
      return (
        title.trim() !== "" ||
        cleanTextForCompare(content) !== "" ||
        mediaItems.length > 0 ||
        tasks.length > 0 ||
        questionnaires.length > 0
      );
    }
    return (
      title !== orig.title ||
      cleanTextForCompare(content) !== cleanTextForCompare(orig.content) ||
      mediaItems.length !== orig.mediaItems.length ||
      tasks.length !== orig.tasks.length ||
      questionnaires.length !== orig.questionnaires.length
    );
  };

  const isLangDirty = (langId: string): boolean => {
    const current = getLangTabData(langId);
    const baseline = langBaselineRef.current[langId];
    if (!baseline) {
      return (
        (current.title || "").trim() !== "" ||
        cleanTextForCompare(current.content) !== "" ||
        (current.taskDescriptions || []).some((d) => d.trim() !== "") ||
        (current.questionnaires || []).length > 0 ||
        (current.mediaItems || []).length > 0 ||
        (current.resourceLabels || []).some((l) => l.trim() !== "")
      );
    }
    return (
      (current.title || "") !== (baseline.title || "") ||
      cleanTextForCompare(current.content) !== cleanTextForCompare(baseline.content || "") ||
      JSON.stringify(current.taskDescriptions || []) !== JSON.stringify(baseline.taskDescriptions || []) ||
      (current.questionnaires || []).length !== (baseline.questionnaires || []).length ||
      (current.mediaItems || []).length !== (baseline.mediaItems || []).length ||
      JSON.stringify(current.resourceLabels || []) !== JSON.stringify(baseline.resourceLabels || [])
    );
  };

  const isCurrentTabDirty = (): boolean =>
    activeLangTab === "en" ? isEnglishDirty() : isLangDirty(activeLangTab);

  const attemptTabSwitch = (targetTabId: string) => {
    if (targetTabId === activeLangTab) return;
    if (isCurrentTabDirty()) {
      setPendingTabSwitch(targetTabId);
      return;
    }
    setActiveLangTab(targetTabId);
  };

  const handleDiscardAndSwitch = () => {
    if (!pendingTabSwitch) return;
    if (activeLangTab === "en") {
      const orig = normalizedInitialRef.current;
      setTitle(orig?.title || "");
      setContent(orig?.content || "");
      setMediaItems(orig?.mediaItems || []);
      setTasks(orig?.tasks || []);
      setQuestionnaires(orig?.questionnaires || []);
    } else {
      const baseline = langBaselineRef.current[activeLangTab] || {};
      updateLangTabData(activeLangTab, {
        title: baseline.title || "",
        content: baseline.content || "",
        mediaItems: baseline.mediaItems || [],
        questionnaires: baseline.questionnaires || [],
        taskDescriptions: baseline.taskDescriptions || [],
        resourceLabels: baseline.resourceLabels || [],
      });
    }
    setActiveLangTab(pendingTabSwitch);
    setPendingTabSwitch(null);
  };

  const handleSaveAndSwitchTab = async () => {
    if (!pendingTabSwitch) return;
    setIsSwitchSaving(true);
    try {
      const success =
        activeLangTab === "en" ? handleSave() : await handleSaveTranslation(activeLangTab);
      if (success) {
        setActiveLangTab(pendingTabSwitch);
        setPendingTabSwitch(null);
      }
    } finally {
      setIsSwitchSaving(false);
    }
  };

  // English CSV import can only create a brand-new content — there's no "add more
  // English components to an existing content" route on the backend. Checked here,
  // on the click itself, rather than only inside handleBuilderTemplateUpload: with
  // the button `disabled` the click never reaches the file picker at all, so an
  // admin clicking it in this state would otherwise see nothing happen.
  const handleUploadTemplateClick = () => {
    if (isImportingCsv) return;
    if (!isAI && builderController.contentId && builderController.activeLanguage === "en") {
      showToast(
        "This content already exists — add more components individually, or switch to a translation tab to import a translation CSV.",
        "error",
      );
      return;
    }
    csvInputRef.current?.click();
  };

  const handleTemplateUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const csvText = await file.text();
      const parsed = parseContentUploadTemplate(csvText);

      setTitle(parsed.title);
      setContent(parsed.content);
      setQuestionnaires(parsed.questionnaires);
      setTasks(parsed.tasks);

      showToast(
        `Template imported successfully. Loaded ${parsed.questionnaires.length} assessment question(s) and ${parsed.tasks.length} task(s).`,
        "success",
      );
      if (parsed.warnings.length > 0) {
        showToast(
          `${parsed.warnings.length} value(s) in the CSV weren't recognized and were skipped: ${parsed.warnings.join(" ")}`,
          "error",
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to import this CSV file. Please check the template format.";
      showToast(message, "error");
    } finally {
      event.target.value = "";
    }
  };

  const handleDownloadBuilderTemplate = async () => {
    const res = await contentBuilderService.downloadImportCsvTemplate();
    if (!res.success) showToast(res.error || "Failed to download the template.", "error");
  };

  // CSV import is two different backend operations depending on state: no content
  // yet -> creates the whole content in one atomic import; an existing content on a
  // non-English tab -> translates it. There's no "add more English components via
  // CSV" once the content exists — do that per-component instead.
  const handleBuilderTemplateUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImportingCsv(true);
    try {
      if (!builderController.contentId) {
        if (!selectedDate) {
          showToast("Date is required.", "error");
          return;
        }
        const { date: utcDate, time: utcTime } = buildContentShellDateTime(
          selectedDate,
          hour,
          minute,
          ampm as "AM" | "PM",
          timeZone,
        );
        const formData = new FormData();
        formData.append("file", file);
        formData.append("content_date", utcDate);
        formData.append("content_time", utcTime.slice(0, 5));
        formData.append("link_to_previous_content", String(isLinked));

        const res = await contentBuilderService.importCsv(programId!, formData);
        if (!res.success || !res.data) throw new Error(res.error || "Failed to import this CSV file.");

        const full = await contentBuilderService.getContent(programId!, res.data.content_id, {
          includeTranslations: false,
        });
        if (full.success && full.data) {
          builderController.hydrateFromServer(full.data);
          savedShellSnapshotRef.current = {
            hour,
            minute,
            ampm,
            isLinked,
            title: full.data.title,
          };
        }
        onSave({ id: res.data.content_id, _contentBuilderSync: true });

        showToast(
          `Imported ${res.data.components_created} component(s), ${res.data.items_created} item(s).`,
          "success",
        );
      } else if (builderController.activeLanguage !== "en") {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("language_code", builderController.activeLanguage);

        const res = await contentBuilderService.importCsvTranslation(builderController.contentId, formData);
        if (!res.success || !res.data) throw new Error(res.error || "Failed to import this translation CSV.");

        void queryClient.invalidateQueries({
          queryKey: contentBuilderKeys.contentForLanguage(
            programId!,
            builderController.contentId,
            builderController.activeLanguage,
          ),
        });
        void queryClient.invalidateQueries({
          queryKey: contentBuilderKeys.missingTranslations(builderController.contentId),
        });
        refreshCalendarInBackground();

        showToast(
          `Translated ${res.data.components_translated} component(s), ${res.data.items_translated} item(s).`,
          "success",
        );
      } else {
        showToast(
          "This content already exists — CSV import can only create a new content or add a translation, not add more English components.",
          "error",
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to import this CSV file. Please check the template format.";
      showToast(message, "error");
    } finally {
      setIsImportingCsv(false);
      event.target.value = "";
    }
  };

  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [showReviewScriptModal, setShowReviewScriptModal] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const handleRegenerate = () => {
    setShowRegenerateModal(true);
  };

  const handleClose = () => {
    const cleanContent = (html: string) =>
      html
        .replace(/<[^>]*>?/gm, "")
        .replace(/\s+/g, "")
        .trim();

    if (!initialData) {
      const hasUnsavedChanges =
        title.trim() !== "" ||
        cleanContent(content) !== "" ||
        mediaItems.length > 0 ||
        tasks.length > 0 ||
        questionnaires.length > 0;
      if (hasUnsavedChanges) {
        setShowCloseConfirm(true);
        return;
      }
    } else {
      const orig = normalizedInitialRef.current;
      if (orig) {
        const contentChanged =
          cleanContent(content) !== cleanContent(orig.content);

        const hasChanged =
          title !== orig.title ||
          contentChanged ||
          mediaItems.length !== orig.mediaItems.length ||
          tasks.length !== orig.tasks.length ||
          questionnaires.length !== orig.questionnaires.length;

        if (hasChanged) {
          setShowCloseConfirm(true);
          return;
        }
      }
    }
    onClose();
  };

  // Dirty-check for the server-backed Content Builder path: the content shell and
  // components persist automatically (on add/save), so this only needs to warn
  // about a never-saved block (would be lost) or shell fields (date/time/link/title)
  // edited since the last time they were synced to the server.
  const builderIsDirty =
    !isAI &&
    (builderController.hasUnsavedBlocks ||
      builderController.isTitleTranslationsDirty() ||
      (!builderController.contentId
        ? builderController.title.trim().length > 0
        : !savedShellSnapshotRef.current ||
          savedShellSnapshotRef.current.hour !== hour ||
          savedShellSnapshotRef.current.minute !== minute ||
          savedShellSnapshotRef.current.ampm !== ampm ||
          savedShellSnapshotRef.current.isLinked !== isLinked ||
          savedShellSnapshotRef.current.title !== builderController.title));

  const handleBuilderClose = () => {
    if (builderIsDirty) {
      setShowCloseConfirm(true);
      return;
    }
    onClose();
  };

  // No separate "save details" step: typing a title and adding (or saving) a
  // component creates the content shell on the fly, and keeps its date/time/link
  // fields in sync on every later save — this is called right before either.
  // `linkedOverride` exists purely to dodge a stale-closure gap: the Link toggle's
  // onClick needs to auto-save the value it just flipped to, but `setIsLinked` won't
  // be reflected in this render's `isLinked` closure until React re-renders — passing
  // the target value straight through is simpler than an effect + "skip on hydrate" ref.
  const ensureBuilderContentShell = async (opts?: {
    silent?: boolean;
    linkedOverride?: boolean;
  }): Promise<boolean> => {
    if (!builderController.title.trim()) {
      if (!opts?.silent) showToast("Please enter a title first.", "error");
      return false;
    }
    if (!selectedDate) {
      if (!opts?.silent) showToast("Date is required.", "error");
      return false;
    }
    const linked = opts?.linkedOverride ?? isLinked;
    const snap = savedShellSnapshotRef.current;
    const unchanged =
      !!builderController.contentId &&
      !!snap &&
      snap.hour === hour &&
      snap.minute === minute &&
      snap.ampm === ampm &&
      snap.isLinked === linked &&
      snap.title === builderController.title &&
      !builderController.isTitleTranslationsDirty();
    if (unchanged) return true;

    const wasNew = !builderController.contentId;
    try {
      const id = await builderController.saveDetails({
        date: selectedDate,
        hour,
        minute,
        ampm: ampm as "AM" | "PM",
        timeZone,
        linkToPrevious: linked,
      });
      savedShellSnapshotRef.current = {
        hour,
        minute,
        ampm,
        isLinked: linked,
        title: builderController.title,
      };
      if (wasNew) showToast("Content created.", "success");
      onSave({ id, _contentBuilderSync: true });
      return true;
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Failed to save content details.",
        "error",
      );
      return false;
    }
  };

  // Footer CTA: creates/syncs the content shell first, then adds the block locally
  // (still unsaved until its own "Save Component" click) — the single entry point
  // for adding components now that the inline picker is hidden.
  const handleAddBuilderComponent = async (type: ContentBlockType) => {
    const ok = await ensureBuilderContentShell();
    if (!ok) return;
    builderController.addBlock(type);
  };

  const contentIdForDelete = isAI
    ? initialData?.content_id ?? initialData?.id
    : builderController.contentId;
  const canDeleteContent =
    contentIdForDelete !== null &&
    contentIdForDelete !== undefined &&
    String(contentIdForDelete).trim() !== "";

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            {(isAI ? !!initialData?.id : !!builderController.contentId) ? "Editing Content for" : "Adding Content for"}{" "}
            <span>{dateLabel || "Wednesday, 8 Oct 2025"}</span>
            {activeLangTab !== "en" && (
              <span className={langStyles.readOnlyBadge} style={{ marginLeft: 10, fontSize: 11, verticalAlign: "middle" }}>
                Read Only (some sections)
              </span>
            )}
          </div>
          <div className={styles.infoLink}>
            <span>ⓘ</span> Learn how to add content
          </div>
          <div className={styles.closeIcon} onClick={isAI ? handleClose : handleBuilderClose}>
            ✕
          </div>
        </div>

        {/* isLoading/isImportingCsv overlays are siblings of the scrollable .modalBody
            (not nested inside it) — `position: absolute` pins to the nearest positioned
            ancestor's own box, and .modalBody scrolls internally, so an overlay nested
            inside it would be pinned to the top of the scrollable *content* and scroll
            out of view instead of staying over the visible viewport. .modalContainer
            doesn't scroll, so anchoring here keeps it visible regardless of scroll. */}
        {isLoading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner}></div>
            <span>Please wait... Saving your content</span>
          </div>
        )}

        {isImportingCsv && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner}></div>
            <span>Importing CSV...</span>
          </div>
        )}

        {/* Body */}
        <div className={styles.modalBody}>
          <div style={isTrial ? { pointerEvents: "none", userSelect: "none" } : undefined}>
          {/* Language tabs — En is always shown; additional tabs from selectedLanguages */}
          {isAI && activeLangTabs.length > 0 && (
            <div className={langStyles.langTabsRow}>
              <button
                className={`${langStyles.langTab} ${activeLangTab === "en" ? langStyles.langTabActive : ""}`}
                onClick={() => attemptTabSwitch("en")}
              >
                English
              </button>
              {activeLangTabs.map((lang) => {
                const isIncomplete = missingTranslations?.languages?.some(
                  (l) => l.language_code === lang.id && !l.is_complete,
                );
                return (
                  <button
                    key={lang.id}
                    className={`${langStyles.langTab} ${activeLangTab === lang.id ? langStyles.langTabActive : ""}`}
                    onClick={() => canDeleteContent && attemptTabSwitch(lang.id)}
                    disabled={!canDeleteContent}
                    title={!canDeleteContent ? "Save the English content first to add translations" : undefined}
                  >
                    {lang.name}
                    <span className={`${langStyles.langTabNative} ${activeLangTab === lang.id ? langStyles.langTabActiveNative : ""}`}>
                      {lang.nativeName}
                    </span>
                    {isIncomplete && (
                      <span title="Missing translations">
                        <MissingTranslationIcon />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Language tab content */}
          {activeLangTab !== "en" && (() => {
            const lang = availableLanguages.find((l) => l.id === activeLangTab);
            if (!lang) return null;
            return (
              <LanguageContentTab
                langId={lang.id}
                langName={lang.name}
                programId={programId}
                contentId={initialData?.id ?? initialData?.content_id}
                enMediaItems={mediaItems}
                enQuestionnaires={questionnaires}
                enTasks={tasks}
                enResources={resources}
                hour={hour}
                minute={minute}
                ampm={ampm}
                timeZone={timeZone}
                isLinked={isLinked}
                meetingEnabled={meetingEnabled}
                meetingLink={meetingLink}
                meetingHour={meetingHour}
                meetingMinute={meetingMinute}
                meetingAmPm={meetingAmPm}
                data={getLangTabData(lang.id)}
                onChange={(updates) => updateLangTabData(lang.id, updates)}
                refreshSignal={translationRefreshTick[lang.id]}
                onDataLoaded={(loaded) => {
                  langBaselineRef.current[lang.id] = loaded;
                }}
              />
            );
          })()}

          {/* En tab content */}
          {activeLangTab === "en" && (
            <>
          <div className={styles.contentConfigHeaderRow}>
            <div className={styles.sectionTitle}>Content Configuration</div>
          </div>

          <div className={styles.configRow}>
            <div className={`${styles.configCol} ${styles.configBox}`}>
              <div className={styles.inputLabel}>Content Available From</div>
              <div className={styles.sectionDescription}>
                Set the time when the content becomes available to participants
                on the app
              </div>
              <div className={styles.timeInputs}>
                <select
                  className={styles.selectInput}
                  value={hour}
                  onChange={(e) => setHour(e.target.value)}
                  onBlur={() => !isAI && void ensureBuilderContentShell({ silent: true })}
                >
                  {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => (
                    <option key={h} value={h}>
                      {h.toString().padStart(2, "0")}
                    </option>
                  ))}
                </select>
                <select
                  className={styles.selectInput}
                  value={minute}
                  onChange={(e) => setMinute(e.target.value)}
                  onBlur={() => !isAI && void ensureBuilderContentShell({ silent: true })}
                >
                  {['00', '15', '30', '45'].map(val => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
                <select
                  className={styles.selectInput}
                  value={ampm}
                  onChange={(e) => setAmpm(e.target.value)}
                  onBlur={() => !isAI && void ensureBuilderContentShell({ silent: true })}
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
              <div className={styles.sectionDescription} style={{ paddingTop: "6px" }}>
                Timezone:{" "}
                <span style={{ color: "var(--color-primary)" }}>{timeZone}</span>
              </div>
            </div>
            <div className={`${styles.configCol} ${styles.configBox}`}>
              <div className={styles.inputLabel}>Link to Previous Content</div>
              <div className={styles.sectionDescription}>
                When enabled, participants must complete the previous content to unlock this one
              </div>
              <div className={styles.toggleContainer}>
                <div
                  className={`${styles.toggleSwitch} ${isLinked ? styles.active : ""} ${
                    isFirstProgramDay ? styles.toggleSwitchDisabled : ""
                  }`}
                  onClick={() => {
                    if (isFirstProgramDay) return;
                    const next = !isLinked;
                    setIsLinked(next);
                    if (!isAI) void ensureBuilderContentShell({ silent: true, linkedOverride: next });
                  }}
                >
                  <div className={styles.toggleKnob}></div>
                </div>
                <span>Enable linking this content</span>
              </div>
              {isFirstProgramDay && (
                <div className={styles.toggleLockedHint}>
                  <span className={styles.toggleLockedHintIcon}>i</span>
                  Cannot be enabled as this is the first content of the program
                </div>
              )}
            </div>
          </div>

          {/* Shared Content Form replacement */}
          {isAI ? (
            <SharedContentForm
              title={title}
              setTitle={setTitle}
              content={content}
              setContent={setContent}
              resources={resources}
              setResources={setResources}
              mediaItems={mediaItems}
              setMediaItems={setMediaItems}
              tasks={tasks}
              setTasks={setTasks}
              questionnaires={questionnaires}
              setQuestionnaires={setQuestionnaires}
              isPastDate={disableForPastDate}
              isAI={isAI}
              videoScript={videoScript}
              onDeleteScript={() => {
                setVideoScript("");
                setGeneratedMedia([]);
              }}
              onReviewScript={() => setShowReviewScriptModal(true)}
              generatedMedia={generatedMedia}
              isGeneratingVideo={isGeneratingVideo}
              meetingEnabled={meetingEnabled}
              setMeetingEnabled={setMeetingEnabled}
              meetingLink={meetingLink}
              setMeetingLink={setMeetingLink}
              meetingHour={meetingHour}
              setMeetingHour={setMeetingHour}
              meetingMinute={meetingMinute}
              setMeetingMinute={setMeetingMinute}
              meetingAmPm={meetingAmPm}
              setMeetingAmPm={setMeetingAmPm}
              contentSectionActions={
                <div className={styles.csvActions}>
                  <button
                    type="button"
                    className={styles.csvDownloadBtn}
                    onClick={() => downloadContentUploadTemplate()}
                  >
                    Download template
                  </button>
                  <button
                    className={styles.uploadMediaBtn}
                    type="button"
                    onClick={handleUploadTemplateClick}
                  >
                    Import content from CSV
                  </button>
                  <input
                    ref={csvInputRef}
                    type="file"
                    hidden
                    accept=".csv,text/csv"
                    onChange={handleTemplateUpload}
                  />
                </div>
              }
            />
          ) : (
            <>
              <div className={styles.contentConfigHeaderRow}>
                <div className={styles.sectionTitle}>Content Components</div>
              </div>
              <LiveMultiLangContentBuilder
                selectedLanguages={selectedLanguages}
                controller={builderController}
                programId={programId}
                isPastDate={disableForPastDate}
                ensureContentShell={ensureBuilderContentShell}
                onContentChanged={refreshCalendarInBackground}
                hideAddComponentButton
                afterTabsContent={
                  <div className={`${styles.configBox} ${styles.importContentBox}`}>
                    <div className={styles.importContentInfo}>
                      <div className={styles.importContentTitle}>Import Content</div>
                      <div className={styles.importContentDesc}>
                        Upload a filled-in CSV using the template below to create this content and all of
                        its components in one go
                      </div>
                    </div>
                    <div className={styles.importContentActions}>
                      <button
                        type="button"
                        className={styles.importDownloadLink}
                        onClick={() => void handleDownloadBuilderTemplate()}
                        disabled={isImportingCsv}
                      >
                        Download Template
                      </button>
                      <button
                        className={`${styles.uploadMediaBtn} ${styles.importUploadBtn}`}
                        type="button"
                        onClick={handleUploadTemplateClick}
                        disabled={isImportingCsv}
                        title={
                          !!builderController.contentId && builderController.activeLanguage === "en"
                            ? "This content already exists — add more components individually, or switch to a translation tab to import a translation CSV"
                            : undefined
                        }
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        Upload CSV
                      </button>
                      <input
                        ref={csvInputRef}
                        type="file"
                        hidden
                        accept=".csv,text/csv"
                        onChange={handleBuilderTemplateUpload}
                      />
                    </div>
                  </div>
                }
              />
            </>
          )}

          <div style={{ height: 32 }}></div>
          </>
          )}

          </div>
        </div>

        {/* Footer */}
        {isTrial && (
          <div className={styles.trialNotice}>
            Content editing is not available in Trial mode
          </div>
        )}
        <div className={styles.modalFooter}>
          {onDelete && initialData && canDeleteContent ? (
            <span
              className={styles.deleteLink}
              onClick={isTrial ? undefined : () => setShowDeleteConfirm(true)}
              style={isTrial ? { opacity: 0.4, cursor: "not-allowed", pointerEvents: "none" } : undefined}
            >
              Delete this Content
            </span>
          ) : !isAI && builderController.blocks.length === 0 ? (
            <p className={styles.addComponentHelperText}>
              Build your day&apos;s content by adding one or more components. Each component represents a
              learning element such as text, media, assessment, poll, and many others.
            </p>
          ) : (
            <span />
          )}
          <div className={styles.rightButtons}>
            {!isAI ? (
              <AddComponentPicker
                existingTypes={builderController.blocks.map((b) => b.type)}
                onSelect={handleAddBuilderComponent}
                disabled={!builderController.title.trim() || isTrial || disableForPastDate || builderController.activeLanguage !== "en"}
                align="right"
                variant="secondary"
              />
            ) : activeLangTab !== "en" ? (
              isLastTab ? (
                <button
                  className={`${styles.saveBtn} ${translatingLang === activeLangTab ? styles.btnLoading : ""}`}
                  onClick={() => handleSaveTranslationAndClose(activeLangTab)}
                  disabled={isTrial || !canDeleteContent || translatingLang === activeLangTab}
                >
                  {translatingLang === activeLangTab ? "Saving..." : "Save & Close"}
                </button>
              ) : (
                <>
                  {!canDeleteContent && (
                    <span className={styles.sectionDescription} style={{ alignSelf: "center" }}>
                      Save the English content first to add translations
                    </span>
                  )}
                  <button
                    className={styles.cancelBtn}
                    onClick={handleClose}
                    disabled={translatingLang === activeLangTab}
                  >
                    Close
                  </button>
                  <button
                    className={`${styles.saveBtn} ${
                      translatingLang === activeLangTab ? styles.btnLoading : ""
                    }`}
                    onClick={() => handleSaveTranslationAndNext(activeLangTab)}
                    disabled={isTrial || !canDeleteContent || translatingLang === activeLangTab}
                  >
                    {translatingLang === activeLangTab ? "Saving..." : "Save & Next"}
                  </button>
                </>
              )
            ) : isAI ? (
              <>
                <button
                  className={styles.outlineBtn}
                  onClick={handleRegenerate}
                  disabled={isLoading || isTrial}
                >
                  Regenerate this Content using AI
                </button>
                <button
                  className={styles.saveBtn}
                  onClick={handleConfirm}
                  disabled={isLoading || isTrial}
                >
                  Confirm this Content
                </button>
              </>
            ) : isLastTab ? (
              <button
                className={`${styles.saveBtn} ${isLoading ? styles.btnLoading : ""}`}
                onClick={handleSave}
                disabled={isLoading || isTrial}
              >
                {isLoading ? "Saving..." : "Save & Close"}
              </button>
            ) : (
              <>
                <button
                  className={styles.cancelBtn}
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Close
                </button>
                <button
                  className={`${styles.saveBtn} ${
                    isLoading ? styles.btnLoading : ""
                  }`}
                  onClick={handleSaveAndNext}
                  disabled={isLoading || isTrial}
                >
                  {isLoading ? "Saving..." : "Save & Next"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showRegenerateModal && (
        <RegeneratePromptModal
          isOpen={showRegenerateModal}
          onClose={() => setShowRegenerateModal(false)}
          onRegenerate={async (prompt: string) => {
            const cid = initialData?.id || initialData?.content_id;
            if (!cid) {
              showToast("Unable to find content ID for regeneration", "error");
              return;
            }

            showToast("Regeneration started...", "info");
            try {
              const res = await regenerateContentMutation.mutateAsync({
                program_content_id: cid,
                feedback: prompt,
              });
              if (res.success) {
                showToast("Content successfully regenerated!", "success");
                setShowRegenerateModal(false);
                // Refreshing the page to show latest AI content in planner
                setTimeout(() => window.location.reload(), 1500);
              } else {
                showToast(res.error || "Failed to regenerate content", "error");
              }
            } catch (error) {
              console.error("Regeneration error:", error);
              showToast("An error occurred during regeneration", "error");
            }
          }}
          dateLabel={dateLabel}
        />
      )}

      {showReviewScriptModal && (
        <ReviewScriptModal
          isOpen={showReviewScriptModal}
          onClose={() => setShowReviewScriptModal(false)}
          script={videoScript}
          dateLabel={dateLabel}
          onGenerate={async (
            type: "video" | "audio",
            extra?: {
              avatar_id?: string;
              voice_id?: string;
              voice_name?: string;
              video_script?: string;
              audio_script?: string;
            },
          ) => {
            const cid = initialData?.id || initialData?.content_id;
            if (!cid) {
              showToast("Unable to find content ID", "error");
              return;
            }

            setIsGeneratingVideo(true);

            if (type === "audio") {
              try {
                const res = await generateAudioMutation.mutateAsync({
                  program_content_id: cid,
                  ...(extra?.audio_script ? { audio_script: extra.audio_script } : {}),
                  ...(extra?.voice_name ? { voice_name: extra.voice_name } : {}),
                });
                if (res.success) {
                  const data = res.data as Record<string, unknown>;
                  const mediaUrl =
                    data?.audio_s3_url ||
                    data?.video_s3_url ||
                    data?.url ||
                    data?.media_url ||
                    data?.path;
                  const mediaTitle = (data?.title as string) || null;
                  if (typeof mediaUrl === "string" && mediaUrl) {
                    setGeneratedMedia((prev) => [
                      ...prev,
                      {
                        url: mediaUrl,
                        type: "audio",
                        title: mediaTitle || undefined,
                      },
                    ]);
                  }
                  setShowReviewScriptModal(false);
                } else {
                  showToast(res.error || "Failed to generate audio", "error");
                }
              } catch (error) {
                console.error("Audio generation error:", error);
                showToast("An error occurred while generating audio", "error");
              } finally {
                setIsGeneratingVideo(false);
              }
              return;
            }

            try {
              const useNewApi =
                extra?.avatar_id && extra?.voice_id && programId;
              const res = useNewApi
                ? await generateVideoWithAvatarMutation.mutateAsync({
                    program_content_id: cid,
                    avatar_id: extra!.avatar_id!,
                    voice_id: extra!.voice_id!,
                    program_id: programId!,
                    ...(extra?.video_script ? { video_script: extra.video_script } : {}),
                  })
                : await generateVideoMutation.mutateAsync({
                    program_content_id: cid,
                    ...(extra?.video_script ? { video_script: extra.video_script } : {}),
                  });
              if (!res.success) {
                showToast(
                  res.error || "Failed to start video generation",
                  "error",
                );
                return;
              }
              const data = res.data as unknown;
              const statusPollId =
                extractStatusPollIdFromGenerateVideoResponse(data) ??
                String(cid);
              if (!statusPollId) {
                showToast(
                  "Could not read program content id from the response.",
                  "error",
                );
                return;
              }
              const { success, raw } =
                await pollGenerateVideoStatusUntilTerminal(statusPollId);
              const urls = extractGeneratedVideoUrlsFromStatusPayload(raw);
              const primaryUrl = urls.pageUrl || urls.playbackUrl || "";
              const playback = urls.playbackUrl || urls.pageUrl || "";
              if (success) {
                let thumbnailUrl: string | undefined;
                const thumbSource =
                  urls.downloadUrl || urls.playbackUrl || null;
                if (thumbSource) {
                  thumbnailUrl =
                    (await generateVideoThumbnailDataUrl(thumbSource)) ||
                    undefined;
                }
                const displayTitle = urls.title || undefined;
                if (primaryUrl || playback) {
                  setGeneratedMedia((prev) => [
                    ...prev,
                    {
                      url: primaryUrl || playback,
                      playbackUrl: playback || undefined,
                      type: "video" as const,
                      title: displayTitle,
                      thumbnailUrl,
                    },
                  ]);
                }
              } else {
                showToast(toastMessageForTerminalFailure(raw), "error");
              }
              onVideoGenerationStarted?.({
                programContentId: cid,
                statusPollId: String(statusPollId),
              });
            } catch (error) {
              console.error("Video generation error:", error);
              showToast(
                error instanceof Error
                  ? error.message
                  : "An error occurred while generating video",
                "error",
              );
            } finally {
              setIsGeneratingVideo(false);
            }
          }}
        />
      )}

      {showCloseConfirm && (
        <ConfirmCloseModal
          onConfirm={() => {
            setShowCloseConfirm(false);
            onClose();
          }}
          onCancel={() => setShowCloseConfirm(false)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmCloseModal
          title="Delete Content"
          message="Are you sure you want to delete this content? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          showDeleteIcon
          onConfirm={() => {
            setShowDeleteConfirm(false);
            if (canDeleteContent && onDelete) {
              onDelete(String(contentIdForDelete));
            }
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {pendingTabSwitch && (
        <ConfirmCloseModal
          title="Unsaved Changes"
          message="You have unsaved changes on this tab. Save them before switching, or discard and switch anyway?"
          confirmText="Discard & Switch"
          cancelText="Cancel"
          extraActionText="Save Changes"
          extraActionLoading={isSwitchSaving}
          onConfirm={handleDiscardAndSwitch}
          onCancel={() => setPendingTabSwitch(null)}
          onExtraAction={handleSaveAndSwitchTab}
        />
      )}
    </div>,
    document.body,
  );
}

function RegeneratePromptModal({
  isOpen,
  onClose,
  onRegenerate,
  dateLabel,
}: any) {
  const [prompt, setPrompt] = useState("");

  return createPortal(
    <div className={styles.modalOverlay} style={{ zIndex: 100000 }}>
      <div
        className={styles.modalContainer}
        style={{ width: "500px", height: "auto" }}
      >
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            Regenerate the Content <span>({dateLabel})</span>
          </div>
          <div className={styles.closeIcon} onClick={onClose}>
            ✕
          </div>
        </div>
        <div className={styles.modalBody} style={{ padding: "24px" }}>
          <div className={styles.sectionDescription}>
            Describe what you&apos;d like to change or improve in the
            regenerated content
          </div>
          <textarea
            className={styles.textInput}
            style={{ minHeight: "120px", resize: "vertical" }}
            placeholder="Enter changes or improvement instructions..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>
        <div
          className={styles.modalFooter}
          style={{ justifyContent: "center", paddingBottom: "32px" }}
        >
          <button
            className={styles.cancelBtn}
            style={{ flex: 1 }}
            onClick={onClose}
          >
            Close
          </button>
          <button
            className={styles.saveBtn}
            style={{ flex: 1 }}
            onClick={() => onRegenerate(prompt)}
          >
            Proceed to Regenerate
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
