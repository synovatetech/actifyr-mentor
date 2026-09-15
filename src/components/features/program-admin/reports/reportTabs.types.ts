export type ReportTabId = 'performance' | 'assessment' | 'task';

export interface ParticipantOption {
  id: number;
  name: string;
  email?: string;
}

export interface ContentOption {
  id: string;
  title: string;
  date?: string | null;
}

export interface TaskFilters {
  contentIds: string[];
  participantIds: string[];
  status: 'completed' | 'pending' | 'any';
}

export interface PerformanceReportResponse {
  total_records?: number;
  columns?: string[];
  data?: Record<string, any>[];
}

export interface AssessmentQuestion {
  question_no: number;
  correct_option: string;
}

export interface AssessmentDateBlock {
  date: string;
  content_id: number;
  questions: AssessmentQuestion[];
}

export interface AssessmentParticipantResponse {
  question_no: number;
  selected_option: string;
  is_correct: boolean;
}

export interface AssessmentParticipantDateResponse {
  content_id: number;
  date: string;
  questions: AssessmentParticipantResponse[];
}

export interface AssessmentParticipantRow {
  sl_no: number;
  participant_name: string;
  responses: AssessmentParticipantDateResponse[];
}

export interface AssessmentReportResponse {
  start_date?: string;
  end_date?: string;
  dates?: AssessmentDateBlock[];
  participants?: AssessmentParticipantRow[];
}

export interface TaskReportRow {
  participant_id: number;
  participant_name: string;
  completed_tasks: number;
  total_tasks: number;
  task_date: string;
  content_title?: string;
}
