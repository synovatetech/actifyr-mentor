/**
 * Single source of truth for the "Task Category" and "Micro-actions" options
 * used by TaskModal, the CSV import parser, and content-save validation —
 * previously the valid micro-action list was hardcoded only inline in
 * TaskModal's JSX, so nothing else could check a value against it.
 */

export interface MicroActionOption {
  id: string;
  desc: string;
}

export const MICRO_ACTIONS: MicroActionOption[] = [
  { id: "Discussion", desc: "navigates user to that page" },
  { id: "Journal", desc: "navigates user to journal page" },
  { id: "Submit", desc: "allows user to upload & submit a file" },
  { id: "Habit", desc: "navigates user to Habit page" },
  { id: "Workbook", desc: "navigates user to Workbook page" },
];

export const VALID_MICRO_ACTION_IDS = MICRO_ACTIONS.map((action) => action.id);

export const MAX_MICRO_ACTIONS_PER_TASK = 2;

export const isValidMicroAction = (value: string): boolean =>
  VALID_MICRO_ACTION_IDS.includes(value);

export const TASK_CATEGORIES = [
  "Proof of Action (PoA)",
  "Proof of Work (PoW)",
  "Proof of Impact (PoI)",
  "General",
] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const isValidTaskCategory = (value: string): value is TaskCategory =>
  (TASK_CATEGORIES as readonly string[]).includes(value);

export type TaskType = "PoW" | "general" | "PoA" | "PoI";

export const TASK_TYPE_TO_CATEGORY_LABEL: Record<TaskType, TaskCategory> = {
  PoW: "Proof of Work (PoW)",
  PoA: "Proof of Action (PoA)",
  PoI: "Proof of Impact (PoI)",
  general: "General",
};
