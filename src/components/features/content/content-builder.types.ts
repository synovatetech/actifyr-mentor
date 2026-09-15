import type { Task, Questionnaire } from "./SharedContentForm";
import type { MediaItem } from "./content.types";

export type ContentBlockType =
  | "text"
  | "media"
  | "assessment"
  | "tasks"
  | "resource"
  | "poll"
  | "reflection"
  | "true_false"
  | "rating"
  | "virtual_meeting"
  | "audio_response";

interface ContentBlockBase {
  /** Client-generated id, stable for React keys/dnd — never sent to the API. */
  id: string;
  type: ContentBlockType;
  /** Block-level title, separate from the Day Title. */
  title: string;
  order: number;
  /** API component id once this block has been persisted; absent for unsaved blocks. */
  serverId?: number;
}

/** One overlay per non-English language, keyed by language code — never includes `en`. */
export interface TextBlockTranslation {
  title?: string;
  body?: string;
}

export interface TextBlock extends ContentBlockBase {
  type: "text";
  content: string;
  translations?: Record<string, TextBlockTranslation>;
}

export interface MediaPlaylistItem extends Omit<MediaItem, "type"> {
  id: string;
  mediaType: "video" | "audio";
  thumbnailFile?: File;
  thumbnailDataUrl?: string;
  order: number;
  /** API component-item id once this item has been persisted; absent for unsaved items. */
  serverId?: number;
}

/** Positional against `MediaBlock.items` — index i translates `items[i]`. `null` skips that position. */
export interface MediaItemTranslation {
  hasNewFile?: boolean;
  file?: File;
}

export interface MediaBlockTranslation {
  title?: string;
  items: Array<MediaItemTranslation | null>;
}

export interface MediaBlock extends ContentBlockBase {
  type: "media";
  items: MediaPlaylistItem[];
  translations?: Record<string, MediaBlockTranslation>;
}

/** Positional against `AssessmentBlock.questions`. `right_answer` never translates. */
export interface AssessmentItemTranslation {
  question?: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
}

export interface AssessmentBlockTranslation {
  title?: string;
  items: Array<AssessmentItemTranslation | null>;
}

export interface AssessmentBlock extends ContentBlockBase {
  type: "assessment";
  questions: Questionnaire[];
  translations?: Record<string, AssessmentBlockTranslation>;
}

/** Positional against `TasksBlock.tasks`. `action`/`point` never translate. */
export interface TaskItemTranslation {
  task?: string;
  hasNewAttachment?: boolean;
  file?: File;
}

export interface TasksBlockTranslation {
  title?: string;
  items: Array<TaskItemTranslation | null>;
}

export interface TasksBlock extends ContentBlockBase {
  type: "tasks";
  tasks: Task[];
  translations?: Record<string, TasksBlockTranslation>;
}

export interface ResourceItem {
  id: string;
  type: "url" | "file";
  label: string;
  /** URL value for `type: "url"`; ignored for `type: "file"`. */
  value: string;
  /** Newly-selected file for `type: "file"` items; absent when editing an already-uploaded file. */
  file?: File;
  /** Existing uploaded file's resolved URL, present once persisted. */
  existingFileUrl?: string;
  isDownloadable: boolean;
  /** Mirrors the API's `resource_from`; UI only ever toggles content vs. both. */
  addToResourcesPage: boolean;
  /** API component-item id once this item has been persisted; absent for unsaved items. */
  serverId?: number;
}

/** Positional against `ResourceBlock.items`. `hasNewFile`/`file` only apply to `type: "file"` items — a URL's value is shared across languages and never translates. */
export interface ResourceItemTranslation {
  label?: string;
  hasNewFile?: boolean;
  file?: File;
}

export interface ResourceBlockTranslation {
  title?: string;
  items: Array<ResourceItemTranslation | null>;
}

export interface ResourceBlock extends ContentBlockBase {
  type: "resource";
  items: ResourceItem[];
  translations?: Record<string, ResourceBlockTranslation>;
}

export interface PollOption {
  id: string;
  text: string;
}

export interface PollBlockTranslation {
  title?: string;
  question?: string;
  /** Positional against `PollBlock.options`. */
  options?: string[];
}

export interface PollBlock extends ContentBlockBase {
  type: "poll";
  question: string;
  options: PollOption[];
  translations?: Record<string, PollBlockTranslation>;
}

export interface ReflectionPrompt {
  id: string;
  prompt: string;
  minChars?: number;
}

export interface ReflectionBlockTranslation {
  title?: string;
  /** Positional against `ReflectionBlock.prompts`. `minChars` never translates. */
  questions?: string[];
}

export interface ReflectionBlock extends ContentBlockBase {
  type: "reflection";
  prompts: ReflectionPrompt[];
  translations?: Record<string, ReflectionBlockTranslation>;
}

export interface TrueFalseStatement {
  id: string;
  statement: string;
}

export interface TrueFalseBlockTranslation {
  title?: string;
  /** Positional against `TrueFalseBlock.statements`. */
  statements?: string[];
}

export interface TrueFalseBlock extends ContentBlockBase {
  type: "true_false";
  statements: TrueFalseStatement[];
  translations?: Record<string, TrueFalseBlockTranslation>;
}

export const RATING_SCALE_MIN = 2 as const;
export const RATING_SCALE_MAX = 10 as const;

export interface RatingQuestion {
  id: string;
  question: string;
  /** Client-chosen scale length for this question, 2–10 points. Each question has its own scale. */
  scalePoints: number;
  /** One label per scale point, index 0 = value "1" up to index (scalePoints - 1) = value "N". */
  labels: string[];
}

/** Positional against `RatingBlock.questions`. Labels always translate as a whole (same keys as English), never the scale size. */
export interface RatingItemTranslation {
  question?: string;
  labels?: string[];
}

export interface RatingBlockTranslation {
  title?: string;
  items: Array<RatingItemTranslation | null>;
}

export interface RatingBlock extends ContentBlockBase {
  type: "rating";
  questions: RatingQuestion[];
  translations?: Record<string, RatingBlockTranslation>;
}

/** Master Bad → Excellent word gradient a freshly-sized scale samples evenly from,
 * so middle points get varied, sensible defaults instead of one repeated filler word. */
const RATING_LABEL_GRADIENT = [
  "Bad",
  "Poor",
  "Below Average",
  "Fair",
  "Average",
  "Satisfactory",
  "Good",
  "Very Good",
  "Great",
  "Excellent",
] as const;

/** Bad → Excellent defaults for a freshly-sized rating scale, spread evenly across the gradient above. */
export function generateDefaultRatingLabels(scalePoints: number): string[] {
  const maxIndex = RATING_LABEL_GRADIENT.length - 1;
  return Array.from({ length: scalePoints }, (_, i) => {
    const idx = scalePoints === 1 ? 0 : Math.round((i * maxIndex) / (scalePoints - 1));
    return RATING_LABEL_GRADIENT[idx];
  });
}

export interface VirtualMeetingBlockTranslation {
  /** Title is the only translatable field — a meeting's time and URL are shared across languages. */
  title?: string;
}

export interface VirtualMeetingBlock extends ContentBlockBase {
  type: "virtual_meeting";
  url: string;
  /** 12h time-of-day, local to the program timezone — the meeting happens on the content's own day. */
  hour: string;
  minute: string;
  ampm: "AM" | "PM";
  translations?: Record<string, VirtualMeetingBlockTranslation>;
}

/** Fixed at 300s per spec — never admin-configurable. */
export const AUDIO_RESPONSE_MAX_DURATION_SECONDS = 300 as const;

export interface AudioResponsePrompt {
  id: string;
  instruction: string;
  maxDurationSeconds: typeof AUDIO_RESPONSE_MAX_DURATION_SECONDS;
}

export interface AudioResponseBlockTranslation {
  title?: string;
  /** Positional against `AudioResponseBlock.prompts`. */
  prompts?: string[];
}

export interface AudioResponseBlock extends ContentBlockBase {
  type: "audio_response";
  prompts: AudioResponsePrompt[];
  translations?: Record<string, AudioResponseBlockTranslation>;
}

export type ContentBlock =
  | TextBlock
  | MediaBlock
  | AssessmentBlock
  | TasksBlock
  | ResourceBlock
  | PollBlock
  | ReflectionBlock
  | TrueFalseBlock
  | RatingBlock
  | VirtualMeetingBlock
  | AudioResponseBlock;

export interface ComponentTypeMeta {
  type: ContentBlockType;
  label: string;
  description: string;
  /** True only for Virtual Meeting — one live session per day. */
  singleton: boolean;
}

export const COMPONENT_TYPE_REGISTRY: ComponentTypeMeta[] = [
  {
    type: "text",
    label: "Text",
    description: "Rich text with images, formatting & links",
    singleton: false,
  },
  {
    type: "media",
    label: "Media (Audio/Video)",
    description: "Upload or link audio/video, playlist style",
    singleton: false,
  },
  {
    type: "assessment",
    label: "Assessment",
    description: "Multiple-choice questions (4 options)",
    singleton: false,
  },
  {
    type: "tasks",
    label: "Recommended Actions",
    description: "Tasks with points & micro-actions",
    singleton: false,
  },
  {
    type: "resource",
    label: "Resources",
    description: "URL or file resources for this content",
    singleton: false,
  },
  {
    type: "poll",
    label: "Poll",
    description: "One question, 2-5 options",
    singleton: false,
  },
  {
    type: "reflection",
    label: "Reflection Questions",
    description: "Long-form descriptive prompts",
    singleton: false,
  },
  {
    type: "true_false",
    label: "True/False Statement",
    description: "Statement with a boolean answer",
    singleton: false,
  },
  {
    type: "rating",
    label: "Rating",
    description: "Rating question with a client-sized scale (2–10 points)",
    singleton: false,
  },
  {
    type: "virtual_meeting",
    label: "Virtual Meeting",
    description: "One live session for the day",
    singleton: true,
  },
  {
    type: "audio_response",
    label: "Audio Recording Response",
    description: "Prompted audio recordings, max 5 min",
    singleton: false,
  },
];

export const COMPONENT_TYPE_LABELS: Record<ContentBlockType, string> =
  COMPONENT_TYPE_REGISTRY.reduce(
    (acc, meta) => ({ ...acc, [meta.type]: meta.label }),
    {} as Record<ContentBlockType, string>,
  );

const genId = () => Math.random().toString(36).substr(2, 9);

/** Builds a default-shaped block for a freshly-added component of the given type. */
export function createDefaultBlock(
  type: ContentBlockType,
  order: number,
): ContentBlock {
  const base = { id: genId(), order };
  const label = COMPONENT_TYPE_LABELS[type];

  switch (type) {
    case "text":
      return { ...base, type, title: label, content: "" };
    case "media":
      return { ...base, type, title: label, items: [] };
    case "assessment":
      return { ...base, type, title: label, questions: [] };
    case "tasks":
      return { ...base, type, title: label, tasks: [] };
    case "resource":
      return { ...base, type, title: label, items: [] };
    case "poll":
      return {
        ...base,
        type,
        title: label,
        question: "",
        options: [
          { id: genId(), text: "" },
          { id: genId(), text: "" },
        ],
      };
    case "reflection":
      return { ...base, type, title: label, prompts: [] };
    case "true_false":
      return { ...base, type, title: label, statements: [] };
    case "rating":
      return { ...base, type, title: label, questions: [] };
    case "virtual_meeting":
      return { ...base, type, title: label, url: "", hour: "10", minute: "00", ampm: "AM" };
    case "audio_response":
      return { ...base, type, title: label, prompts: [] };
    default: {
      const _exhaustive: never = type;
      throw new Error(`Unknown block type: ${_exhaustive}`);
    }
  }
}
