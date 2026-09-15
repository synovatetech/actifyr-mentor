import type { ContentBlock } from "@/components/features/content/content-builder.types";
import {
  COMPONENT_TYPE_LABELS,
  RATING_SCALE_MIN,
  RATING_SCALE_MAX,
} from "@/components/features/content/content-builder.types";

const getPlainText = (html: string): string =>
  String(html || "")
    .replace(/<[^>]*>?/gm, "")
    .replace(/&nbsp;/g, " ")
    .trim();

const isValidUrl = (value: string): boolean => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

/** Returns a list of human-readable errors; empty array means the block list is save-ready. */
export function validateBlocks(blocks: ContentBlock[]): string[] {
  const errors: string[] = [];

  blocks.forEach((block) => {
    const label = block.title?.trim() || COMPONENT_TYPE_LABELS[block.type];

    if (!block.title || !block.title.trim()) {
      errors.push(`Give the "${COMPONENT_TYPE_LABELS[block.type]}" component a title.`);
    }

    switch (block.type) {
      case "text":
        if (!getPlainText(block.content)) {
          errors.push(`"${label}" is empty — add some content or delete it.`);
        }
        break;
      case "media":
        if (block.items.length === 0) {
          errors.push(`"${label}" needs at least one audio/video item.`);
        }
        break;
      case "assessment":
        if (block.questions.length === 0) {
          errors.push(`"${label}" needs at least one question.`);
        }
        break;
      case "tasks":
        if (block.tasks.length === 0) {
          errors.push(`"${label}" needs at least one task.`);
        }
        break;
      case "resource":
        if (block.items.length === 0) {
          errors.push(`"${label}" needs at least one resource.`);
        } else {
          block.items.forEach((item) => {
            if (!item.label.trim()) {
              errors.push(`"${label}" has a resource with no label.`);
            } else if (item.type === "url" && !item.value.trim()) {
              errors.push(`"${label}" has a URL resource with no link.`);
            } else if (item.type === "file" && !item.file && !item.existingFileUrl) {
              errors.push(`"${label}" has a file resource with no file attached.`);
            }
          });
        }
        break;
      case "poll":
        if (!block.question.trim()) {
          errors.push(`"${label}" needs a question.`);
        }
        if (block.options.length < 2 || block.options.length > 5) {
          errors.push(`"${label}" needs between 2 and 5 options.`);
        } else if (block.options.some((o) => !o.text.trim())) {
          errors.push(`"${label}" has an empty option.`);
        }
        break;
      case "reflection":
        if (block.prompts.length === 0) {
          errors.push(`"${label}" needs at least one prompt.`);
        }
        break;
      case "true_false":
        if (block.statements.length === 0) {
          errors.push(`"${label}" needs at least one statement.`);
        }
        break;
      case "rating":
        if (block.questions.length === 0) {
          errors.push(`"${label}" needs at least one question.`);
        }
        block.questions.forEach((q, i) => {
          if (q.scalePoints < RATING_SCALE_MIN || q.scalePoints > RATING_SCALE_MAX) {
            errors.push(
              `"${label}" question ${i + 1}'s scale must be between ${RATING_SCALE_MIN} and ${RATING_SCALE_MAX} points.`,
            );
          } else if (q.labels.some((l) => !l.trim())) {
            errors.push(`"${label}" question ${i + 1} has a blank scale label.`);
          }
        });
        break;
      case "audio_response":
        if (block.prompts.length === 0) {
          errors.push(`"${label}" needs at least one prompt.`);
        }
        break;
      case "virtual_meeting": {
        if (!block.url.trim()) {
          errors.push(`"${label}" needs a meeting URL.`);
          break;
        }
        if (!isValidUrl(block.url.trim())) {
          errors.push(`"${label}" has an invalid meeting URL.`);
        }
        break;
      }
      default:
        break;
    }
  });

  return errors;
}
