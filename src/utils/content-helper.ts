import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { getUserTimeZone } from "./date-time";

dayjs.extend(utc);
dayjs.extend(timezone);

export const MAX_MEDIA_FILE_SIZE_BYTES = 50 * 1024 * 1024;
export const MIN_MEDIA_DURATION_SECONDS = 10;
export const MEDIA_FILE_SIZE_ERROR_MESSAGE =
  "Video/audio file size must not exceed 50MB.";
export const MEDIA_DURATION_ERROR_MESSAGE =
  "Video/audio files must be at least 10 seconds long. Please upload a longer file.";

/** Resolves 0 when duration can't be read (e.g. corrupt file) so callers don't block on unknown duration. */
export const getMediaDurationInSeconds = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const mediaElement = document.createElement(
      file.type.startsWith("video") ? "video" : "audio",
    );
    mediaElement.preload = "metadata";

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      mediaElement.removeAttribute("src");
    };

    const resolveDuration = (duration: number) => {
      cleanup();
      resolve(
        !Number.isFinite(duration) || duration < 0 ? 0 : Math.round(duration),
      );
    };

    mediaElement.onloadedmetadata = () =>
      resolveDuration(mediaElement.duration);
    mediaElement.onerror = () => resolveDuration(0);
    mediaElement.src = objectUrl;
  });
};

/** Validates a video/audio upload against the size cap; duration must be checked separately once metadata loads. */
export const validateMediaFileSize = (file: File): string | null =>
  file.size > MAX_MEDIA_FILE_SIZE_BYTES ? MEDIA_FILE_SIZE_ERROR_MESSAGE : null;

const normalizeTaskAction = (action: string) => {
  const normalized = String(action || "").trim();
  if (!normalized) return "";
  if (normalized.toLowerCase() === "submit file") return "Submit";
  return normalized;
};

const normalizeTaskActions = (actions: unknown) => {
  if (!Array.isArray(actions)) return [];
  return Array.from(
    new Set(actions.map((action) => normalizeTaskAction(String(action))).filter(Boolean)),
  );
};

const formatTimeTo24h = (timeStr: string) => {
  if (!timeStr) return "10:00:00";
  if (timeStr.includes("AM") || timeStr.includes("PM")) {
    const [time, ampm] = timeStr.trim().split(" ");
    const [hours, minutes] = time.split(":");
    let h = parseInt(hours, 10);
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return `${h.toString().padStart(2, "0")}:${minutes || "00"}:00`;
  }
  // If it's already HH:MM or HH:MM:SS
  const parts = timeStr.split(":");
  const h = parts[0]?.padStart(2, "0") || "10";
  const m = parts[1]?.padStart(2, "0") || "00";
  const s = parts[2]?.padStart(2, "0") || "00";
  return `${h}:${m}:${s}`;
};

/** Maps API resource rows to form state; checkbox reflects resource_from === "both" */
const mapResourceFromApi = (r: any) => ({
  ...r,
  id: r.id ? String(r.id) : undefined,
  type: r.type || "file",
  label: r.label || "",
  value: r.value || r.url || "",
  is_downloadable: !!r.is_downloadable,
  addToResourcesPage:
    !!r.add_to_resources_page ||
    !!r.addToResourcesPage ||
    String(r.resource_from || "").toLowerCase() === "both",
});

export const createContentFormData = (
  data: any,
  programId: string | number,
  dateOverride?: Date,
) => {
  const formData = new FormData();
  const selectedTimeZone = data.timeZone || getUserTimeZone();
  if (programId) {
    formData.append("program_id", String(programId));
  }
  formData.append("time_zone", selectedTimeZone);

  if (data.title !== undefined) formData.append("title", data.title);
  if (data.content !== undefined) formData.append("content", data.content);

  // Date handling — combine local date + time, then convert to UTC
  let dateOnly = "";
  if (dateOverride) {
    dateOnly = dayjs(dateOverride).format("YYYY-MM-DD");
  } else if (data.date) {
    const parsed = dayjs(data.date);
    dateOnly = parsed.isValid()
      ? parsed.format("YYYY-MM-DD")
      : String(data.date).slice(0, 10);
  }

  const timeOnly = formatTimeTo24h(data.time);

  if (dateOnly) {
    const localDateTime = dayjs.tz(
      `${dateOnly} ${timeOnly}`,
      "YYYY-MM-DD HH:mm:ss",
      selectedTimeZone,
    );
    const utcDate = localDateTime.utc().format("YYYY-MM-DD HH:mm:ss");
    const utcTime = localDateTime.utc().format("HH:mm:ss");
    formData.append("date", utcDate);
    formData.append("time", utcTime);
  }

  if (data.link_to_previous_content !== undefined) {
    formData.append(
      "link_to_previous_content",
      String(data.link_to_previous_content),
    );
  }
  if (data.content_status !== undefined) {
    formData.append("content_status", data.content_status);
  }
  if (data.is_ai_generated !== undefined) {
    formData.append("is_ai_generated", String(data.is_ai_generated));
  }
  if (data.review_status !== undefined) {
    formData.append("review_status", data.review_status);
  }
  if (data.meet_time !== undefined) {
    const meetTime24h = formatTimeTo24h(String(data.meet_time || ""));
    if (dateOnly) {
      const localMeetingDateTime = dayjs.tz(
        `${dateOnly} ${meetTime24h}`,
        "YYYY-MM-DD HH:mm:ss",
        selectedTimeZone,
      );
      const utcMeetTime = localMeetingDateTime.utc().format("HH:mm:ss");
      formData.append("meet_time", utcMeetTime);
    } else {
      formData.append("meet_time", meetTime24h);
    }
  }
  if (data.meet_available !== undefined) {
    formData.append("meet_available", String(data.meet_available));
  }
  if (data.meet_link !== undefined) {
    formData.append("meet_link", String(data.meet_link || ""));
  }

  // Tasks Metadata
  if (data.tasks) {
    const tasksMetadata = data.tasks.map((task: any) => {
      // Only actual File uploads count as new attachments (API may send attachment URL strings)
      const newAttachmentFile =
        task.file instanceof File
          ? task.file
          : task.attachment instanceof File
            ? task.attachment
            : null;
      const hasNewAttachment = !!newAttachmentFile;
      if (hasNewAttachment && newAttachmentFile) {
        formData.append("task_attachments", newAttachmentFile);
      }
      const type = task.type || "general";
      let safeType = "general";
      const lowerType = type.toLowerCase();
      if (lowerType.includes("pow")) safeType = "PoW";
      else if (lowerType.includes("poa"))
        safeType = "PoA";
      else if (lowerType.includes("poi"))
        safeType = "PoI";

      const metadata: any = {
        type: safeType,
        task: task.task || task.description || task.title || "",
        action: normalizeTaskActions(task.action),
        has_new_attachment: hasNewAttachment,
        point: Number(task.point || 0),
      };

      if (task.id && !isNaN(Number(task.id))) {
        metadata.id = Number(task.id);
      }
      if (data.id) metadata.content_id = Number(data.id);
      if (programId) metadata.program_id = Number(programId);

      return metadata;
    });
    formData.append("tasks", JSON.stringify(tasksMetadata));
  }

  // Questionnaires Metadata
  if (data.questionnaires) {
    const questionnairesMetadata = data.questionnaires.map((q: any) => {
      const metadata: any = {
        question: q.question || "",
        option_a: q.option_a || "",
        option_b: q.option_b || "",
        option_c: q.option_c || "",
        option_d: q.option_d || "",
        right_answer: q.right_answer || "",
      };

      if (q.id && !isNaN(Number(q.id))) {
        metadata.id = Number(q.id);
      }
      if (data.id) metadata.content_id = Number(data.id);
      if (programId) metadata.program_id = Number(programId);

      return metadata;
    });
    formData.append("questionnaires", JSON.stringify(questionnairesMetadata));
  }

  // Resources Metadata
  if (data.resources !== undefined) {
    const validResources = (data.resources || []).filter(
      (res: any) => res.label || res.value || res.file || res.id,
    );

    const resourcesMetadata = validResources.map((res: any) => {
      const hasNewFile = res.type === "file" && !!res.file;
      if (hasNewFile) {
        formData.append("resource_files", res.file);
      }
      const metadata: any = {
        type: res.type || "url",
        label: res.label || res.value || "",
        value: res.type === "url" ? res.value || "" : "",
        resource_from: res.addToResourcesPage ? "both" : "content",
        is_downloadable: !!res.is_downloadable,
        has_new_file: hasNewFile,
      };
      if (res.id && !isNaN(Number(res.id))) {
        metadata.id = Number(res.id);
      }
      return metadata;
    });
    formData.append("resources_metadata", JSON.stringify(resourcesMetadata));
  }

  // AI Generated Media Links
  if (data.ai_media_files_links && data.ai_media_files_links.length > 0) {
    formData.append(
      "ai_media_files_links",
      JSON.stringify(data.ai_media_files_links),
    );
  }

  // Media Files Metadata — always send the key so backend can remove files when array is empty
  const mediaItems = data.mediaItems || [];
  const mediaMetadata = mediaItems.map((m: any) => {
    const hasNewFile = !!m.file;
    if (hasNewFile) {
      formData.append("media_files", m.file);
    }
    const metadata: any = {
      type: m.type || (m.file?.type.startsWith("video") ? "video" : "audio"),
      name: m.name || m.file?.name || "media_file",
      thumbnail_path: m.thumbnail_path || null,
      duration: Number(m.duration || 0),
      has_new_file: hasNewFile,
    };
    if (m.id && !isNaN(Number(m.id))) {
      metadata.id = Number(m.id);
    }
    return metadata;
  });
  formData.append("media_files_metadata", JSON.stringify(mediaMetadata));

  return formData;
};

const stripHtmlToText = (html: string): string =>
  String(html || "").replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim();

/**
 * Returns a human-readable label for each section that has a value in the
 * English content but is still empty in this language's translation — used to
 * block saving a translation until it has parity with whatever English has
 * filled in, rather than silently saving a partial translation.
 */
export const getMissingTranslationSections = (
  langData: { title?: string; content?: string; taskDescriptions?: string[]; questionnaires?: any[] },
  enTitle: string,
  enContent: string,
  enTasks: any[],
  enQuestionnaires: any[],
): string[] => {
  const missing: string[] = [];

  if (enTitle.trim() && !(langData.title && langData.title.trim())) {
    missing.push("Title");
  }
  if (stripHtmlToText(enContent) && !stripHtmlToText(langData.content || "")) {
    missing.push("Content");
  }
  enTasks.forEach((task, i) => {
    if (stripHtmlToText(task?.description || "") && !stripHtmlToText(langData.taskDescriptions?.[i] || "")) {
      missing.push(`Task ${i + 1}`);
    }
  });
  enQuestionnaires.forEach((q, i) => {
    const translated = langData.questionnaires?.[i];
    if (q?.question?.trim() && !(translated?.question && translated.question.trim())) {
      missing.push(`Question ${i + 1}`);
    }
  });

  return missing;
};

/**
 * Builders for POST /client/content/{content_id}/translate.
 * Questionnaire/task/media translations are matched to their English counterpart
 * by array index and require a real (already-persisted) numeric id on that
 * counterpart — entries pairing with an unsaved/local id are skipped since the
 * API validates each id against an existing row.
 */

export const buildQuestionnaireTranslations = (
  langQuestionnaires: any[] | undefined,
  enQuestionnaires: any[],
): Record<string, any>[] => {
  return (langQuestionnaires || [])
    .map((q, i) => {
      const questionnaireId = Number(enQuestionnaires[i]?.id);
      if (!q || isNaN(questionnaireId)) return null;
      const entry: Record<string, any> = { questionnaire_id: questionnaireId };
      if (q.question) entry.question = q.question;
      if (q.option_a) entry.option_a = q.option_a;
      if (q.option_b) entry.option_b = q.option_b;
      if (q.option_c) entry.option_c = q.option_c;
      if (q.option_d) entry.option_d = q.option_d;
      return entry;
    })
    .filter(Boolean) as Record<string, any>[];
};

export const buildTaskTranslations = (
  langTaskDescriptions: string[] | undefined,
  enTasks: any[],
): Array<{ task_id: number; task: string }> => {
  return (langTaskDescriptions || [])
    .map((desc, i) => {
      const taskId = Number(enTasks[i]?.id);
      if (!desc || !desc.trim() || isNaN(taskId)) return null;
      return { task_id: taskId, task: desc };
    })
    .filter(Boolean) as Array<{ task_id: number; task: string }>;
};

export const buildMediaTranslationEntries = (
  langMediaItems: any[] | undefined,
  enMediaItems: any[],
): Array<{ media_file_id: number; file: File }> => {
  return (langMediaItems || [])
    .map((m, i) => {
      const mediaFileId = Number(enMediaItems[i]?.id);
      if (!m?.file || isNaN(mediaFileId)) return null;
      return { media_file_id: mediaFileId, file: m.file as File };
    })
    .filter(Boolean) as Array<{ media_file_id: number; file: File }>;
};

/**
 * Resource labels are the only translatable field surfaced in the UI today
 * (file/URL value is shared across languages per the translate API, not translated) —
 * so this only ever sends `label`, never `has_new_file`/`resource_files`.
 */
export const buildResourceTranslations = (
  langResourceLabels: string[] | undefined,
  enResources: any[],
): Array<{ resource_id: number; label: string }> => {
  return (langResourceLabels || [])
    .map((label, i) => {
      const resourceId = Number(enResources[i]?.id);
      if (!label || !label.trim() || isNaN(resourceId)) return null;
      return { resource_id: resourceId, label };
    })
    .filter(Boolean) as Array<{ resource_id: number; label: string }>;
};

/**
 * Builds the multipart payload for POST /client/content/{content_id}/translate,
 * composing the index-paired builders above. Returns null when there is
 * nothing to translate for this language, so callers can skip the request entirely.
 */
export const buildContentTranslationFormData = (
  languageCode: string,
  langData: {
    title?: string;
    content?: string;
    mediaItems?: any[];
    questionnaires?: any[];
    taskDescriptions?: string[];
    resourceLabels?: string[];
  },
  enQuestionnaires: any[],
  enTasks: any[],
  enMediaItems: any[],
  enResources: any[] = [],
): FormData | null => {
  const questionnaireTranslations = buildQuestionnaireTranslations(
    langData.questionnaires,
    enQuestionnaires,
  );
  const taskTranslations = buildTaskTranslations(
    langData.taskDescriptions,
    enTasks,
  );
  const mediaEntries = buildMediaTranslationEntries(langData.mediaItems, enMediaItems);
  const resourceTranslations = buildResourceTranslations(
    langData.resourceLabels,
    enResources,
  );

  const hasTitle = !!(langData.title && langData.title.trim());
  const hasContent = !!(
    langData.content && langData.content.replace(/<[^>]*>?/gm, "").trim()
  );

  if (
    !hasTitle &&
    !hasContent &&
    questionnaireTranslations.length === 0 &&
    taskTranslations.length === 0 &&
    mediaEntries.length === 0 &&
    resourceTranslations.length === 0
  ) {
    return null;
  }

  const formData = new FormData();
  formData.append("language_code", languageCode);
  if (hasTitle) formData.append("title", langData.title!);
  if (hasContent) formData.append("content_text", langData.content!);
  if (questionnaireTranslations.length > 0) {
    formData.append(
      "questionnaire_translations",
      JSON.stringify(questionnaireTranslations),
    );
  }
  if (taskTranslations.length > 0) {
    formData.append("task_translations", JSON.stringify(taskTranslations));
  }
  if (mediaEntries.length > 0) {
    formData.append(
      "media_files_metadata",
      JSON.stringify(
        mediaEntries.map((m) => ({ media_file_id: m.media_file_id })),
      ),
    );
    mediaEntries.forEach((m) => formData.append("media_files", m.file));
  }
  if (resourceTranslations.length > 0) {
    formData.append("resource_translations", JSON.stringify(resourceTranslations));
  }

  return formData;
};

const ANSWER_INDEX_TO_LETTER: Record<number, string> = { 1: "A", 2: "B", 3: "C", 4: "D" };

export const normalizeContentData = (data: any) => {
  if (!data) return null;

  const normalized = { ...data };

  const plainTextToHtml = (text: string): string => {
    if (/<[a-z][\s\S]*>/i.test(text)) return text;
    // Normalize literal \n sequences to actual newlines first
    const normalized = text.replace(/\\n/g, "\n");
    return normalized
      .split(/\n\n+/)
      .filter((para) => para.trim())
      .map((para) => `<p>${para.replace(/\n/g, "<br/>")}</p>`)
      .join("");
  };

  // AI content specific mapping
  if (data.introduction || data.video_script || data.actions) {
    let fullContent = "";
    if (data.introduction)
      fullContent += `<h2>Introduction</h2>${plainTextToHtml(data.introduction)}`;
    if (data.actions)
      fullContent += `<h2>Actions</h2>${plainTextToHtml(data.actions)}`;
    normalized.content = fullContent;
  }

  // Support both video_script and audio_script payload keys from AI responses.
  const aiScript = data.video_script || data.audio_script;
  if (aiScript) {
    normalized.video_script =
      typeof aiScript === "string" ? plainTextToHtml(aiScript) : aiScript;
  }

  // AI MCQs mapping to questionnaires
  if (data.mcqs && (!data.questionnaires || data.questionnaires.length === 0)) {
    normalized.questionnaires = data.mcqs.map((m: any) => {
      let rightAnswer = "";
      if (typeof m.correct_answer === "number") {
        rightAnswer = ANSWER_INDEX_TO_LETTER[m.correct_answer] || "";
      } else if (typeof m.correct_answer === "string") {
        rightAnswer = m.correct_answer.toUpperCase();
      }
      return {
        id: m.id ? String(m.id) : Math.random().toString(36).substr(2, 9),
        question: m.question || "",
        option_a: m.options?.[0] || "",
        option_b: m.options?.[1] || "",
        option_c: m.options?.[2] || "",
        option_d: m.options?.[3] || "",
        right_answer: rightAnswer,
      };
    });
  }

  // AI Resources: handle object { label, url }, string, or array of objects
  if (
    data.resources &&
    !Array.isArray(data.resources) &&
    typeof data.resources === "object" &&
    data.resources.url &&
    (!data.resources_metadata || data.resources_metadata.length === 0)
  ) {
    normalized.resources = [
      {
        type: "url" as const,
        label: data.resources.label || "",
        value: data.resources.url,
        resource_from: "content",
        is_downloadable: false,
        addToResourcesPage: false,
      },
    ];
  } else if (
    typeof data.resources === "string" &&
    data.resources.trim().length > 0 &&
    (!data.resources_metadata || data.resources_metadata.length === 0)
  ) {
    const urlRegex = /https?:\/\/[^\s,)"'<>]+/;
    const text = data.resources.replace(/\\n/g, "\n");
    const lines = text.split("\n").filter((l: string) => l.trim());
    const parsed: any[] = [];
    for (const line of lines) {
      const match = line.match(urlRegex);
      if (match) {
        const url = match[0];
        const label = line
          .replace(url, "")
          .replace(/[-–:,\s]+$/, "")
          .replace(/^[-–:,\s]+/, "")
          .trim();
        parsed.push({
          type: "url" as const,
          label,
          value: url,
          resource_from: "content",
          is_downloadable: false,
          addToResourcesPage: false,
        });
      }
    }
    if (parsed.length === 0) {
      const globalUrlRegex = /https?:\/\/[^\s,)"'<>]+/g;
      const urls = data.resources.match(globalUrlRegex) || [];
      normalized.resources = urls.map((url: string) => ({
        type: "url" as const,
        label: "",
        value: url,
        resource_from: "content",
        is_downloadable: false,
        addToResourcesPage: false,
      }));
    } else {
      normalized.resources = parsed;
    }
  }

  // Normalize Date & Time
  // The API may return date as a combined datetime string like "2025-10-08 10:00:00"
  // We need to split it into separate date and time fields
  if (normalized.date && !normalized.time) {
    const dateStr = String(normalized.date).trim();
    // Check if date contains a time component (e.g. "2025-10-08 10:00:00" or "2025-10-08T10:00:00")
    const dateTimeParts = dateStr.split(/[T\s]/);
    if (dateTimeParts.length >= 2 && dateTimeParts[1]) {
      normalized.date = dateTimeParts[0]; // "2025-10-08"
      normalized.time = dateTimeParts[1]; // "10:00:00"
    }
  }
  // Also try unlock_date as a fallback for the date field
  if (!normalized.date && normalized.unlock_date) {
    const unlockStr = String(normalized.unlock_date).trim();
    const dateTimeParts = unlockStr.split(/[T\s]/);
    normalized.date = dateTimeParts[0];
    if (dateTimeParts.length >= 2 && dateTimeParts[1] && !normalized.time) {
      normalized.time = dateTimeParts[1];
    }
  }

  // Normalize Tasks (supports legacy tasks and AI action_tasks payload)
  const rawTasks = Array.isArray(data.tasks)
    ? data.tasks
    : Array.isArray(data.action_tasks)
      ? data.action_tasks
      : [];
  if (rawTasks.length > 0) {
    normalized.tasks = rawTasks.map((t: any) => ({
      ...t,
      id: t.id ? String(t.id) : Math.random().toString(36).substr(2, 9),
      description:
        t.description || t.task_description || t.task || t.title || "",
      title: t.title || t.task_name || t.task || "",
      type: t.type || t.task_name || "general",
      point:
        t.point !== undefined
          ? Number(t.point)
          : t.points !== undefined
            ? Number(t.points)
            : 0,
      action: normalizeTaskActions(
        Array.isArray(t.action)
          ? t.action
          : typeof t.action === "string"
            ? JSON.parse(t.action)
            : [],
      ),
    }));
  }

  // Normalize Questionnaires
  if (data.questionnaires && Array.isArray(data.questionnaires)) {
    normalized.questionnaires = data.questionnaires.map((q: any) => {
      const rawAnswer = q.right_answer ?? q.correct_answer ?? "";
      const rightAnswer =
        typeof rawAnswer === "number"
          ? ANSWER_INDEX_TO_LETTER[rawAnswer] || ""
          : String(rawAnswer || "").toUpperCase();
      return {
        ...q,
        id: q.id ? String(q.id) : Math.random().toString(36).substr(2, 9),
        question: q.question || "",
        option_a: q.option_a || "",
        option_b: q.option_b || "",
        option_c: q.option_c || "",
        option_d: q.option_d || "",
        right_answer: rightAnswer,
      };
    });
  }

  // Normalize Resources — when API returns `resources` as an array, spread above
  // already set normalized.resources, so we must still map resource_from → checkbox
  if (!normalized.resources && (data.resources_metadata || data.resources)) {
    const rawRes = data.resources_metadata || data.resources;
    if (Array.isArray(rawRes)) {
      normalized.resources = rawRes;
    } else if (typeof rawRes === "object" && rawRes !== null && rawRes.url) {
      normalized.resources = [
        {
          type: "url" as const,
          label: rawRes.label || "",
          value: rawRes.url,
          resource_from: "content",
          is_downloadable: false,
          addToResourcesPage: false,
        },
      ];
    } else {
      normalized.resources = [];
    }
  }

  if (Array.isArray(normalized.resources) && normalized.resources.length > 0) {
    normalized.resources = normalized.resources.map(mapResourceFromApi);
  }

  // Normalize Media Items
  if (
    !normalized.mediaItems &&
    (data.media_files_metadata || data.media_files || data.media)
  ) {
    const rawMedia =
      data.media_files_metadata || data.media_files || data.media;
    normalized.mediaItems = Array.isArray(rawMedia)
      ? rawMedia.map((m: any) => ({
          ...m,
          id: m.id ? String(m.id) : Math.random().toString(36).substr(2, 9),
          type:
            m.type ||
            (m.file_path?.endsWith(".mp3") || m.file_path?.endsWith(".wav")
              ? "audio"
              : "video"),
          previewUrl: m.url || m.file_path || m.previewUrl || "",
          name: m.name || m.file_name || "Media File",
        }))
      : [];
  }

  return normalized;
};
