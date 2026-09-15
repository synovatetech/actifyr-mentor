export interface GoalHabitRow {
  id: number;
  name: string;
  email?: string;
  title: string;
  description?: string;
  status?: "New" | "Updated" | "Opened" | "";
  progress?: string;
  createdAt?: string;
  originalData?: Record<string, unknown>;
}
