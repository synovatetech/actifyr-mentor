import type { Questionnaire, Task } from "@/components/features/content/SharedContentForm";
import {
  MAX_MICRO_ACTIONS_PER_TASK,
  TASK_TYPE_TO_CATEGORY_LABEL,
  VALID_MICRO_ACTION_IDS,
  isValidTaskCategory,
} from "@/utils/task-options";

type CsvRow = Record<string, string>;

export interface ParsedContentUploadPayload {
  title: string;
  content: string;
  questionnaires: Questionnaire[];
  tasks: Task[];
  /** Human-readable notes on data the parser couldn't accept as-is (e.g. an
   * unrecognized micro-action) and had to drop or normalize. */
  warnings: string[];
}

const QUESTION_PREFIX = "Assessment_Question_";
const ANSWER_PREFIX = "Assessment_Answer_";
const CORRECT_PREFIX = "Assessment_CorrectAnswer_";

const TASK_CATEGORY_PREFIX = "Task_";
const TASK_POINTS_SUFFIX = "_Points";
const TASK_TASK_SUFFIX = "_Task";
const TASK_MICROACTIONS_SUFFIX = "_Microactions";

const EMPTY_HTML = "<p></p>";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const textToHtml = (value: string) => {
  const clean = value.trim();
  if (!clean) return EMPTY_HTML;
  return clean
    .split(/\r?\n/)
    .map((line) => `<p>${escapeHtml(line.trim()) || "<br/>"}</p>`)
    .join("");
};

const normalizeHeader = (header: string) => header.trim();

const normalizeCell = (value: string) =>
  value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

const parseCsv = (input: string): CsvRow[] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let index = 0;
  let inQuotes = false;

  while (index < input.length) {
    const char = input[index];
    const next = input[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 2;
        continue;
      }
      inQuotes = !inQuotes;
      index += 1;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      index += 1;
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";

      if (char === "\r" && next === "\n") {
        index += 2;
      } else {
        index += 1;
      }
      continue;
    }

    cell += char;
    index += 1;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  if (!rows.length) return [];

  const headers = rows[0].map((header) => normalizeHeader(header));
  return rows
    .slice(1)
    .filter((dataRow) => dataRow.some((value) => value.trim().length > 0))
    .map((dataRow) => {
      const record: CsvRow = {};
      headers.forEach((header, headerIndex) => {
        record[header] = normalizeCell(dataRow[headerIndex] || "");
      });
      return record;
    });
};

const inferTaskType = (category: string): Task["type"] => {
  const normalized = category.toLowerCase();
  if (normalized.includes("pow")) return "PoW";
  if (normalized.includes("poi")) return "PoI";
  if (normalized.includes("poa")) return "PoA";
  return "general";
};

/** Matches TaskModal micro-action ids (file upload is optional; Submit ≠ attachment in list UI). */
const MICRO_ACTION_ALIASES: Record<string, string> = {
  discussion: "Discussion",
  discussions: "Discussion",
  journal: "Journal",
  journals: "Journal",
  submit: "Submit",
  habit: "Habit",
  workbook: "Workbook",
};

const normalizeMicroActionToken = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const key = trimmed.toLowerCase();
  if (MICRO_ACTION_ALIASES[key]) return MICRO_ACTION_ALIASES[key];
  const titleCase =
    trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  if (VALID_MICRO_ACTION_IDS.includes(titleCase)) {
    return titleCase;
  }
  // Unrecognized token — dropped rather than passed through, so the CSV
  // can never inject a value the Micro-actions dropdown doesn't offer
  // (previously this returned `trimmed` unchanged, silently letting any
  // string in, with no way to remove it from the task afterwards).
  return null;
};

/** Falls back to the category implied by the inferred task type when the CSV's
 * raw category text doesn't match one of TaskModal's four dropdown options —
 * otherwise the Task Category select would be bound to a value with no
 * matching <option>, rendering blank until the user manually re-picks one. */
const normalizeTaskCategory = (rawCategory: string, type: Task["type"]): string =>
  isValidTaskCategory(rawCategory) ? rawCategory : TASK_TYPE_TO_CATEGORY_LABEL[type];

const toQuestionId = () => Math.random().toString(36).slice(2, 11);
const toTaskId = () => Math.random().toString(36).slice(2, 11);

const toQuestionnaires = (row: CsvRow): Questionnaire[] => {
  const indexes = Object.keys(row)
    .filter((key) => key.startsWith(QUESTION_PREFIX))
    .map((key) => key.replace(QUESTION_PREFIX, ""))
    .filter((idx) => /^\d+$/.test(idx))
    .sort((a, b) => Number(a) - Number(b));

  return indexes
    .map((idx) => {
      const question = row[`${QUESTION_PREFIX}${idx}`] || "";
      if (!question) return null;

      const optionA = row[`${ANSWER_PREFIX}${idx}_A`] || "";
      const optionB = row[`${ANSWER_PREFIX}${idx}_B`] || "";
      const optionC = row[`${ANSWER_PREFIX}${idx}_C`] || "";
      const optionD = row[`${ANSWER_PREFIX}${idx}_D`] || "";

      const correctRaw = row[`${CORRECT_PREFIX}${idx}`] || "";
      const correctNormalized = correctRaw.trim().toUpperCase();

      let rightAnswer = "";
      if (["A", "B", "C", "D"].includes(correctNormalized)) {
        rightAnswer = correctNormalized;
      } else if (correctRaw === optionA) {
        rightAnswer = "A";
      } else if (correctRaw === optionB) {
        rightAnswer = "B";
      } else if (correctRaw === optionC) {
        rightAnswer = "C";
      } else if (correctRaw === optionD) {
        rightAnswer = "D";
      }

      return {
        id: toQuestionId(),
        question: textToHtml(question),
        option_a: optionA,
        option_b: optionB,
        option_c: optionC,
        option_d: optionD,
        right_answer: rightAnswer,
      } satisfies Questionnaire;
    })
    .filter(Boolean) as Questionnaire[];
};

const toTasks = (row: CsvRow, warnings: string[]): Task[] => {
  const indexes = Object.keys(row)
    .filter(
      (key) =>
        key.startsWith(TASK_CATEGORY_PREFIX) && key.endsWith("_Category"),
    )
    .map((key) => key.replace("Task_", "").replace("_Category", ""))
    .filter((idx) => /^\d+$/.test(idx))
    .sort((a, b) => Number(a) - Number(b));

  return indexes
    .map((idx) => {
      const category = row[`Task_${idx}_Category`] || "";
      const points = row[`Task_${idx}${TASK_POINTS_SUFFIX}`] || "";
      const taskDescription = row[`Task_${idx}${TASK_TASK_SUFFIX}`] || "";
      const microActions = row[`Task_${idx}${TASK_MICROACTIONS_SUFFIX}`] || "";

      if (!category && !points && !taskDescription && !microActions) {
        return null;
      }

      const rawTokens = microActions
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const action: string[] = [];
      rawTokens.forEach((token) => {
        const normalized = normalizeMicroActionToken(token);
        if (!normalized) {
          warnings.push(
            `Task ${idx}: micro-action "${token}" isn't recognized and was skipped.`,
          );
          return;
        }
        if (action.includes(normalized)) return;
        if (action.length >= MAX_MICRO_ACTIONS_PER_TASK) {
          warnings.push(
            `Task ${idx}: only ${MAX_MICRO_ACTIONS_PER_TASK} micro-actions are allowed, so "${normalized}" was skipped.`,
          );
          return;
        }
        action.push(normalized);
      });

      const type = inferTaskType(category);
      const parsedPoints = Number(points);

      return {
        id: toTaskId(),
        type,
        category: normalizeTaskCategory(category, type),
        title: category || `Task ${idx}`,
        description: textToHtml(taskDescription),
        action,
        point: Number.isFinite(parsedPoints) ? parsedPoints : "",
      } satisfies Task;
    })
    .filter(Boolean) as Task[];
};

export const parseContentUploadTemplate = (
  csvText: string,
): ParsedContentUploadPayload => {
  const parsedRows = parseCsv(csvText);

  if (!parsedRows.length) {
    throw new Error("CSV file has no content rows.");
  }

  const firstRow = parsedRows[0];
  const title = firstRow.Title || "";
  const content = firstRow.Content || "";

  if (!title && !content) {
    throw new Error(
      "CSV row is missing both Title and Content. Please use the template format.",
    );
  }

  const warnings: string[] = [];

  return {
    title,
    content: textToHtml(content),
    questionnaires: toQuestionnaires(firstRow),
    tasks: toTasks(firstRow, warnings),
    warnings,
  };
};

/** File name used when downloading the blank template (headers only). */
export const CONTENT_UPLOAD_TEMPLATE_FILENAME = "content_upload_template.csv";

/**
 * Builds the CSV column headers expected by {@link parseContentUploadTemplate}.
 * Add more questions/tasks by repeating the numbered column pattern (e.g. Assessment_Question_4 …).
 */
export function buildContentUploadTemplateHeaderColumns(
  questionCount = 3,
  taskCount = 2,
): string[] {
  const cols = ["Title", "Content"];
  for (let i = 1; i <= questionCount; i++) {
    cols.push(
      `${QUESTION_PREFIX}${i}`,
      `${ANSWER_PREFIX}${i}_A`,
      `${ANSWER_PREFIX}${i}_B`,
      `${ANSWER_PREFIX}${i}_C`,
      `${ANSWER_PREFIX}${i}_D`,
      `${CORRECT_PREFIX}${i}`,
    );
  }
  for (let i = 1; i <= taskCount; i++) {
    cols.push(
      `Task_${i}_Category`,
      `Task_${i}${TASK_POINTS_SUFFIX}`,
      `Task_${i}${TASK_TASK_SUFFIX}`,
      `Task_${i}${TASK_MICROACTIONS_SUFFIX}`,
    );
  }
  return cols;
}

/** Single header row (no data rows) for the downloadable template. */
export const CONTENT_UPLOAD_TEMPLATE_HEADER_ROW =
  buildContentUploadTemplateHeaderColumns().join(",");

/** Triggers a browser download of the blank CSV template (headers only). */
export function downloadContentUploadTemplate(): void {
  if (typeof window === "undefined") return;
  const body = `${CONTENT_UPLOAD_TEMPLATE_HEADER_ROW}\n`;
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = CONTENT_UPLOAD_TEMPLATE_FILENAME;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
