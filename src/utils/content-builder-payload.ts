import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import type {
  ContentBlock,
  ContentBlockType,
  TextBlock,
  MediaBlock,
  AssessmentBlock,
  TasksBlock,
  ResourceBlock,
  PollBlock,
  ReflectionBlock,
  TrueFalseBlock,
  RatingBlock,
  VirtualMeetingBlock,
  AudioResponseBlock,
} from "@/components/features/content/content-builder.types";
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Converts the content shell's local wall-clock date + 12h time into the UTC
 * `date`/`time` strings the API expects, mirroring the same local→UTC conversion
 * `createContentFormData` (content-helper.ts) uses for the legacy content model.
 */
export function buildContentShellDateTime(
  date: Date,
  hour: string,
  minute: string,
  ampm: "AM" | "PM",
  timeZone: string,
): { date: string; time: string } {
  const dateOnly = dayjs(date).format("YYYY-MM-DD");
  let h = parseInt(hour, 10);
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  const timeOnly = `${String(h).padStart(2, "0")}:${minute}:00`;
  const local = dayjs.tz(`${dateOnly} ${timeOnly}`, "YYYY-MM-DD HH:mm:ss", timeZone);
  return { date: local.utc().format("YYYY-MM-DD"), time: local.utc().format("HH:mm:ss") };
}

/** Content Builder multipart component types — everything else is JSON. */
export const MULTIPART_BLOCK_TYPES: ReadonlySet<ContentBlockType> = new Set([
  "media",
  "tasks",
  "resource",
]);

const getPlainText = (html: string): string =>
  String(html || "")
    .replace(/<[^>]*>?/gm, "")
    .replace(/&nbsp;/g, " ")
    .trim();

const nonEmpty = (value: string | undefined | null): string | undefined => {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed : undefined;
};

/** Converts a canvas-generated `data:` URL thumbnail (scene picker) into a real File the multipart body can carry. */
export function dataUrlToFile(dataUrl: string, filename: string): File | null {
  const match = /^data:(.+?);base64,(.*)$/.exec(dataUrl);
  if (!match) return null;
  const [, mime, base64] = match;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

/**
 * Builds the API's `translations` array from a block's `translations` map. `toEntry`
 * returns the language-specific fields (no `language_code`) or `null`/`undefined` when
 * this language has nothing meaningful to send — those languages are dropped entirely,
 * since an empty translations entry is a 400.
 */
function buildTranslationsArray<T>(
  translations: Record<string, T> | undefined,
  toEntry: (value: T) => Record<string, any> | null | undefined,
): Array<Record<string, any>> | undefined {
  if (!translations) return undefined;
  const entries: Array<Record<string, any> | null> = Object.entries(translations).map(
    ([languageCode, value]) => {
      const fields = toEntry(value);
      return fields ? { language_code: languageCode, ...fields } : null;
    },
  );
  const filtered = entries.filter((entry): entry is Record<string, any> => entry !== null);
  return filtered.length > 0 ? filtered : undefined;
}

/** Aligns a positional translation array to the English array's length, filling gaps with `null`. */
function alignPositional<T>(
  values: Array<T | null | undefined> | undefined,
  englishLength: number,
  isBlank: (value: T) => boolean,
): Array<T | null> | null {
  if (!values) return null;
  const aligned = Array.from({ length: englishLength }, (_, i) => {
    const value = values[i];
    return value === undefined || value === null || isBlank(value) ? null : value;
  });
  return aligned.some((v) => v !== null) ? aligned : null;
}

// ── JSON component types ──────────────────────────────────────────────────────

export function buildTextComponentPayload(block: TextBlock) {
  const translations = buildTranslationsArray(block.translations, (t) => {
    const title = nonEmpty(t.title);
    const body = t.body && getPlainText(t.body) ? t.body : undefined;
    if (!title && !body) return null;
    return { ...(title && { title }), ...(body && { body }) };
  });
  return {
    title: block.title || undefined,
    body: block.content,
    ...(translations && { translations }),
  };
}

export function buildQuestionnaireComponentPayload(block: AssessmentBlock) {
  const items = block.questions.map((q) => ({
    // Only the English question is authored via RichTextEditor — a translation is a
    // plain textarea (see AssessmentBlockEditor's translation view), so it's left alone.
    question: q.question,
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c,
    option_d: q.option_d,
    right_answer: q.right_answer,
  }));
  const translations = buildTranslationsArray(block.translations, (t) => {
    const title = nonEmpty(t.title);
    const translatedItems = (t.items || []).map((item) =>
      item
        ? {
            ...(nonEmpty(item.question) && { question: nonEmpty(item.question) }),
            ...(nonEmpty(item.option_a) && { option_a: nonEmpty(item.option_a) }),
            ...(nonEmpty(item.option_b) && { option_b: nonEmpty(item.option_b) }),
            ...(nonEmpty(item.option_c) && { option_c: nonEmpty(item.option_c) }),
            ...(nonEmpty(item.option_d) && { option_d: nonEmpty(item.option_d) }),
          }
        : {},
    );
    const hasAnyItem = translatedItems.some((item) => Object.keys(item).length > 0);
    if (!title && !hasAnyItem) return null;
    return {
      ...(title && { title }),
      items: Array.from({ length: block.questions.length }, (_, i) => translatedItems[i] ?? {}),
    };
  });
  return { title: block.title || undefined, items, ...(translations && { translations }) };
}

export function buildPollComponentPayload(block: PollBlock) {
  const translations = buildTranslationsArray(block.translations, (t) => {
    const title = nonEmpty(t.title);
    const question = nonEmpty(t.question);
    const options = alignPositional(t.options, block.options.length, (v) => !nonEmpty(v));
    if (!title && !question && !options) return null;
    return {
      ...(title && { title }),
      ...(question && { question }),
      ...(options && { options }),
    };
  });
  return {
    title: block.title,
    question: block.question,
    options: block.options.map((o) => o.text),
    ...(translations && { translations }),
  };
}

export function buildMeetingComponentPayload(block: VirtualMeetingBlock) {
  const hour24 =
    block.ampm === "PM" && block.hour !== "12"
      ? String(Number(block.hour) + 12)
      : block.ampm === "AM" && block.hour === "12"
        ? "00"
        : block.hour.padStart(2, "0");
  const translations = buildTranslationsArray(block.translations, (t) => {
    const title = nonEmpty(t.title);
    return title ? { title } : null;
  });
  return {
    title: block.title || undefined,
    meetings: [
      {
        meeting_time: `${hour24}:${block.minute}:00`,
        meeting_url: block.url,
      },
    ],
    ...(translations && { translations }),
  };
}

export function buildReflectionComponentPayload(block: ReflectionBlock) {
  const translations = buildTranslationsArray(block.translations, (t) => {
    const title = nonEmpty(t.title);
    const questions = alignPositional(t.questions, block.prompts.length, (v) => !nonEmpty(v));
    if (!title && !questions) return null;
    return { ...(title && { title }), ...(questions && { questions }) };
  });
  return {
    title: block.title || undefined,
    questions: block.prompts.map((p) => ({
      question: p.prompt,
      ...(p.minChars !== undefined && { minimum_character_count: p.minChars }),
    })),
    ...(translations && { translations }),
  };
}

export function buildTrueFalseComponentPayload(block: TrueFalseBlock) {
  const translations = buildTranslationsArray(block.translations, (t) => {
    const title = nonEmpty(t.title);
    const statements = alignPositional(t.statements, block.statements.length, (v) => !nonEmpty(v));
    if (!title && !statements) return null;
    return { ...(title && { title }), ...(statements && { statements }) };
  });
  return {
    title: block.title || undefined,
    statements: block.statements.map((s) => ({ statement: s.statement })),
    ...(translations && { translations }),
  };
}

function labelsToMap(labels: string[]): Record<string, string> {
  return labels.reduce((acc, text, i) => ({ ...acc, [String(i + 1)]: text }), {} as Record<string, string>);
}

export function buildRatingComponentPayload(block: RatingBlock) {
  const translations = buildTranslationsArray(block.translations, (t) => {
    const title = nonEmpty(t.title);
    const items = block.questions.map((q, i) => {
      const entry = t.items[i];
      const question = entry ? nonEmpty(entry.question) : undefined;
      const labels =
        entry?.labels && entry.labels.length === q.labels.length && entry.labels.every((l) => nonEmpty(l))
          ? labelsToMap(entry.labels)
          : undefined;
      return {
        ...(question && { question }),
        ...(labels && { labels }),
      };
    });
    const hasAnyItem = items.some((item) => Object.keys(item).length > 0);
    if (!title && !hasAnyItem) return null;
    return { ...(title && { title }), items };
  });
  return {
    title: block.title || undefined,
    // Labels are per-question — there is no component-level labels field.
    questions: block.questions.map((q) => ({ question: q.question, labels: labelsToMap(q.labels) })),
    ...(translations && { translations }),
  };
}

export function buildAudioResponseComponentPayload(block: AudioResponseBlock) {
  const translations = buildTranslationsArray(block.translations, (t) => {
    const title = nonEmpty(t.title);
    const prompts = alignPositional(t.prompts, block.prompts.length, (v) => !nonEmpty(v));
    if (!title && !prompts) return null;
    return { ...(title && { title }), ...(prompts && { prompts }) };
  });
  return {
    title: block.title || undefined,
    prompts: block.prompts.map((p) => ({ instruction: p.instruction })),
    ...(translations && { translations }),
  };
}

// ── Multipart component types ─────────────────────────────────────────────────

/** Resolves the File to upload for a media item's thumbnail — a custom upload already has one, a scene-picked frame only has a data URL. */
function resolveThumbnailFile(item: { thumbnailFile?: File; thumbnailDataUrl?: string; name?: string }): File | null {
  if (item.thumbnailFile) return item.thumbnailFile;
  if (item.thumbnailDataUrl) return dataUrlToFile(item.thumbnailDataUrl, `${item.name || "thumbnail"}.jpg`);
  return null;
}

export function buildMediaComponentFormData(block: MediaBlock, isUpdate: boolean): FormData {
  const formData = new FormData();
  if (block.title) formData.append("title", block.title);

  const metadata = block.items.map((item) => {
    const hasNewThumbnail = item.thumbnailDataUrl !== undefined;
    const meta: Record<string, any> = {
      type: item.mediaType,
      name: item.name || "",
      thumbnail_path: null,
      duration: item.duration || 0,
      has_new_thumbnail: hasNewThumbnail,
    };
    if (isUpdate) {
      if (item.serverId) meta.id = item.serverId;
      meta.has_new_file = !item.serverId || !!item.file;
    }
    if (!isUpdate || meta.has_new_file) {
      if (item.file) formData.append("media_files", item.file);
    }
    if (hasNewThumbnail) {
      const thumbFile = resolveThumbnailFile(item);
      if (thumbFile) formData.append("thumbnail_files", thumbFile);
    }
    return meta;
  });
  formData.append("media_files_metadata", JSON.stringify(metadata));

  const translationsArray = buildTranslationsArray(block.translations, (t) => {
    const title = nonEmpty(t.title);
    const items = block.items.map((_, i) => {
      const entry = t.items[i];
      return entry?.hasNewFile ? { has_new_file: true } : {};
    });
    const hasAnyFile = t.items.some((entry) => entry?.hasNewFile);
    if (!title && !hasAnyFile) return null;
    return { ...(title && { title }), items };
  });
  if (translationsArray) {
    formData.append("translations", JSON.stringify(translationsArray));
    Object.entries(block.translations || {}).forEach(([lang, t]) => {
      t.items.forEach((entry) => {
        if (entry?.hasNewFile && entry.file) formData.append(`media_files_${lang}`, entry.file);
      });
    });
  }

  return formData;
}

export function buildTaskComponentFormData(block: TasksBlock, isUpdate: boolean): FormData {
  const formData = new FormData();
  if (block.title) formData.append("title", block.title);

  const metadata = block.tasks.map((task) => {
    const hasNewAttachment = task.file instanceof File;
    const meta: Record<string, any> = {
      type: task.type,
      // Only the English description is authored via RichTextEditor — a translation is a
      // plain textarea (see TasksBlockEditor's translation view), so it's left alone.
      task: task.description || task.title || "",
      action: task.action || [],
      point: Number(task.point || 0),
      has_new_attachment: hasNewAttachment,
    };
    if (isUpdate && task.serverId) meta.id = task.serverId;
    if (hasNewAttachment && task.file) formData.append("task_attachments", task.file);
    return meta;
  });
  formData.append("tasks", JSON.stringify(metadata));

  const translationsArray = buildTranslationsArray(block.translations, (t) => {
    const title = nonEmpty(t.title);
    const items = block.tasks.map((_, i) => {
      const entry = t.items[i];
      const taskText = entry ? nonEmpty(entry.task) : undefined;
      return {
        ...(taskText && { task: taskText }),
        ...(entry?.hasNewAttachment && { has_new_attachment: true }),
      };
    });
    const hasAnyItem = items.some((item) => Object.keys(item).length > 0);
    if (!title && !hasAnyItem) return null;
    return { ...(title && { title }), items };
  });
  if (translationsArray) {
    formData.append("translations", JSON.stringify(translationsArray));
    Object.entries(block.translations || {}).forEach(([lang, t]) => {
      t.items.forEach((entry) => {
        if (entry?.hasNewAttachment && entry.file) formData.append(`task_attachments_${lang}`, entry.file);
      });
    });
  }

  return formData;
}

export function buildResourceComponentFormData(block: ResourceBlock, isUpdate: boolean): FormData {
  const formData = new FormData();
  if (block.title) formData.append("title", block.title);

  const metadata = block.items.map((item) => {
    const isFile = item.type === "file";
    const hasNewFile = isFile && (!item.serverId || !!item.file);
    const meta: Record<string, any> = {
      type: item.type,
      label: item.label,
      value: item.type === "url" ? item.value : "",
      resource_from: item.addToResourcesPage ? "both" : "content",
      is_downloadable: !!item.isDownloadable,
    };
    if (isUpdate) {
      if (item.serverId) meta.id = item.serverId;
      meta.has_new_file = hasNewFile;
    }
    if (isFile && (!isUpdate || hasNewFile) && item.file) {
      formData.append("resource_files", item.file);
    }
    return meta;
  });
  formData.append("resources_metadata", JSON.stringify(metadata));

  const translationsArray = buildTranslationsArray(block.translations, (t) => {
    const title = nonEmpty(t.title);
    const items = block.items.map((_, i) => {
      const entry = t.items[i];
      const label = entry ? nonEmpty(entry.label) : undefined;
      return {
        ...(label && { label }),
        ...(entry?.hasNewFile && { has_new_file: true }),
      };
    });
    const hasAnyItem = items.some((item) => Object.keys(item).length > 0);
    if (!title && !hasAnyItem) return null;
    return { ...(title && { title }), items };
  });
  if (translationsArray) {
    formData.append("translations", JSON.stringify(translationsArray));
    Object.entries(block.translations || {}).forEach(([lang, t]) => {
      t.items.forEach((entry) => {
        if (entry?.hasNewFile && entry.file) formData.append(`resource_files_${lang}`, entry.file);
      });
    });
  }

  return formData;
}

/** Builds the add/update request body for any block type — JSON object for JSON types, `FormData` for multipart types. */
export function buildComponentPayload(block: ContentBlock, isUpdate: boolean): Record<string, any> | FormData {
  switch (block.type) {
    case "text":
      return buildTextComponentPayload(block);
    case "media":
      return buildMediaComponentFormData(block, isUpdate);
    case "assessment":
      return buildQuestionnaireComponentPayload(block);
    case "tasks":
      return buildTaskComponentFormData(block, isUpdate);
    case "resource":
      return buildResourceComponentFormData(block, isUpdate);
    case "poll":
      return buildPollComponentPayload(block);
    case "reflection":
      return buildReflectionComponentPayload(block);
    case "true_false":
      return buildTrueFalseComponentPayload(block);
    case "rating":
      return buildRatingComponentPayload(block);
    case "virtual_meeting":
      return buildMeetingComponentPayload(block);
    case "audio_response":
      return buildAudioResponseComponentPayload(block);
    default: {
      const _exhaustive: never = block;
      throw new Error(`Unknown block type: ${(_exhaustive as ContentBlock).type}`);
    }
  }
}
