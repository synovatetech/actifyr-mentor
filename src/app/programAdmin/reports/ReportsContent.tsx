"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import styles from "@/styles/reports.module.css";
import { ProgramInfoBar } from "@/components/features/program-admin/ProgramInfoBar";
import { PageLoader } from "@/components/ui/Loader";
import ModifyHeadersModal from "@/components/features/program-admin/ModifyHeadersModal";
import ModifyCriteriaModal from "@/components/features/program-admin/ModifyCriteriaModal";
import SendEmailModal, {
  EmailRecipient,
} from "@/components/features/program-admin/SendEmailModal";
import SendWhatsappModal from "@/components/features/program-admin/SendWhatsappModal";
import { useClientAdmin } from "@/hooks/useClientAdmin";
import PerformanceReportTab from "@/components/features/program-admin/reports/PerformanceReportTab";
import AssessmentReportTab from "@/components/features/program-admin/reports/AssessmentReportTab";
import TaskReportTab from "@/components/features/program-admin/reports/TaskReportTab";
import CheckboxMultiSelect from "@/components/features/program-admin/reports/CheckboxMultiSelect";
import type {
  AssessmentDateBlock,
  AssessmentParticipantRow,
  ContentOption,
  ParticipantOption,
  ReportTabId,
  TaskFilters,
  TaskReportRow,
} from "@/components/features/program-admin/reports/reportTabs.types";
import { useProgramId } from "@/hooks/useProgramId";
import { useProgramDetails } from "@/hooks/useProgramDetails";
import { participantsService } from "@/services/api/participants.service";
import { reportsService } from "@/services/api/reports.service";
import {
  whatsappMessageService,
  type WhatsappTemplate,
} from "@/services/api/whatsappMessage.service";
import { useToast } from "@/context/ToastContext";
import * as XLSX from "xlsx";

function formatContentDate(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return null;
  }
}

function normalizeContent(item: any): ContentOption {
  return {
    id: String(item.id ?? item.content_id ?? ""),
    title: item.content_title ?? item.title ?? item.name ?? "",
    date: item.date ?? item.program_date ?? item.content_date ?? null,
  };
}

function normalizeParticipant(item: any): ParticipantOption {
  return {
    id: Number(item.id ?? item.participant_id),
    name: item.name ?? item.participant_name ?? "Participant",
    email: item.email ?? item.participant_email ?? "",
  };
}

const REPORT_TABS: { id: ReportTabId; label: string }[] = [
  { id: "performance", label: "Performance Report" },
  { id: "assessment", label: "Assessment Report" },
  { id: "task", label: "Task Report" },
];

const PERFORMANCE_FIELDS = [
  "participant_name",
  "date_of_joining",
  "team_name",
  "max_points",
  "points_earned",
  "rank",
  "badge",
  "learning_engagement",
  "learning_effectiveness",
  "total_task",
  "tasks_completed",
  "task_pending",
  "number_of_goals",
  "total_goals_completed_pct",
  "number_of_habits",
  "total_habits_completed_pct",
];

const PERFORMANCE_HEADER_OPTIONS: { label: string; field: string }[] = [
  { label: "Participant Name", field: "participant_name" },
  { label: "Date of Joining", field: "date_of_joining" },
  { label: "Team Name", field: "team_name" },
  { label: "Max Points", field: "max_points" },
  { label: "Points Earned", field: "points_earned" },
  { label: "Rank", field: "rank" },
  { label: "Badge", field: "badge" },
  { label: "Learning Engagement", field: "learning_engagement" },
  { label: "Learning Effectiveness", field: "learning_effectiveness" },
  { label: "Total Tasks", field: "total_task" },
  { label: "Tasks Completed", field: "tasks_completed" },
  { label: "Tasks Pending", field: "task_pending" },
  { label: "Number of Goals", field: "number_of_goals" },
  { label: "Total Goals Completed (%)", field: "total_goals_completed_pct" },
  { label: "Number of Habits", field: "number_of_habits" },
  { label: "Total Habits Completed (%)", field: "total_habits_completed_pct" },
];

const DEFAULT_PERFORMANCE_HEADERS = [
  "Participant Name",
  "Points Earned",
  "Learning Effectiveness",
  "Number of Goals",
];

const buildParticipantsPayload = (participantId: string) => {
  if (participantId === "all") return ["all"];
  return [participantId];
};

const getCurrentDateRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear() - 1, 0, 1);
  const end = new Date(now.getFullYear() + 1, 11, 31);

  const format = (value: Date) => {
    const yyyy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, "0");
    const dd = String(value.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  return {
    startDate: format(start),
    endDate: format(end),
  };
};

export default function ReportsContent() {
  const { programId, isReady } = useProgramId();
  const { showToast } = useToast();
  const { programDetails } = useProgramDetails();
  const { isTrial } = useClientAdmin();
  const toYMD = (d?: string) => (d ? d.split("T")[0] : undefined);
  const programStartDate = toYMD(programDetails?.startDate);
  const programEndDate = toYMD(programDetails?.endDate);

  const [activeTab, setActiveTab] = useState<ReportTabId>("performance");
  const [modals, setModals] = useState({ headers: false, criteria: false });
  const [loading, setLoading] = useState({
    performance: false,
    assessment: false,
    task: false,
  });

  const [participantOptions, setParticipantOptions] = useState<
    ParticipantOption[]
  >([]);

  const [performanceColumns, setPerformanceColumns] = useState<string[]>([]);
  const [performanceRows, setPerformanceRows] = useState<Record<string, any>[]>(
    [],
  );

  const [assessmentDates, setAssessmentDates] = useState<AssessmentDateBlock[]>(
    [],
  );
  const [assessmentParticipants, setAssessmentParticipants] = useState<
    AssessmentParticipantRow[]
  >([]);

  const [taskRows, setTaskRows] = useState<TaskReportRow[]>([]);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<
    number[]
  >([]);
  const [firstLoadFilterVisible, setFirstLoadFilterVisible] = useState({
    performance: true,
    assessment: true,
    task: true,
  });
  const [selectedPerformanceHeaders, setSelectedPerformanceHeaders] = useState<
    string[]
  >(DEFAULT_PERFORMANCE_HEADERS);
  const defaultRange = getCurrentDateRange();
  const [assessmentFilters, setAssessmentFilters] = useState({
    participantId: "all",
    startDate: defaultRange.startDate,
    endDate: defaultRange.endDate,
  });
  const [taskFilters, setTaskFilters] = useState<TaskFilters>({
    contentIds: [],
    participantIds: [],
    status: "any",
  });

  const { data: reportContentsData } = useQuery({
    queryKey: ["report-contents", programId],
    queryFn: async () => {
      const res = await reportsService.getReportContents(programId!);
      if (!res.success) throw new Error(res.error || "Failed to fetch contents");
      const raw: any[] =
        Array.isArray(res.data?.contents) ? res.data.contents :
        Array.isArray(res.data?.data) ? res.data.data :
        Array.isArray(res.data) ? res.data : [];
      return raw.map(normalizeContent) as ContentOption[];
    },
    enabled: !!programId && isReady,
    staleTime: 5 * 60 * 1000,
  });

  const { data: reportParticipantsData } = useQuery({
    queryKey: ["report-participants", programId],
    queryFn: async () => {
      const res = await reportsService.getReportParticipants(programId!);
      if (!res.success) throw new Error(res.error || "Failed to fetch participants");
      const raw: any[] =
        Array.isArray(res.data?.participants) ? res.data.participants :
        Array.isArray(res.data?.data) ? res.data.data :
        Array.isArray(res.data) ? res.data : [];
      return raw.map(normalizeParticipant) as ParticipantOption[];
    },
    enabled: !!programId && isReady,
    staleTime: 5 * 60 * 1000,
  });

  const contentOptions = reportContentsData ?? [];
  const taskParticipantOptions = reportParticipantsData ?? [];

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState<EmailRecipient[]>([]);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const [isWhatsappModalOpen, setIsWhatsappModalOpen] = useState(false);
  const [whatsappRecipients, setWhatsappRecipients] = useState<
    EmailRecipient[]
  >([]);
  const [isSendingWhatsapp, setIsSendingWhatsapp] = useState(false);
  const [whatsappTemplates, setWhatsappTemplates] = useState<
    WhatsappTemplate[]
  >([]);
  const [isLoadingWhatsappTemplates, setIsLoadingWhatsappTemplates] =
    useState(false);

  const fetchParticipants = async () => {
    if (!programId) return;

    const response = await participantsService.list(programId);
    if (!response.success) return;

    const rows = Array.isArray(response.data) ? response.data : [];
    const normalized = rows
      .map((item: any) => {
        const candidateId = Number(
          item.participant_id ??
            item.participantId ??
            item.id ??
            item.user_id ??
            item.userId,
        );

        if (!Number.isFinite(candidateId) || candidateId <= 0) return null;

        return {
          id: candidateId,
          name: item.participant_name || item.name || "Participant",
          email: item.email || "",
        };
      })
      .filter(Boolean) as ParticipantOption[];

    setParticipantOptions(normalized);
  };

  const fetchPerformanceReport = async (
    fields: string[] = PERFORMANCE_FIELDS,
  ) => {
    if (!programId) return;

    setLoading((prev) => ({ ...prev, performance: true }));
    try {
      const response = await reportsService.getPerformanceReport(programId, {
        participants: ["all"],
        fields: fields.length > 0 ? fields : PERFORMANCE_FIELDS,
      });

      if (!response.success) {
        showToast(
          response.error || "Failed to fetch performance report",
          "error",
        );
        return;
      }

      const payload = response.data?.columns
        ? response.data
        : response.data?.data?.columns
        ? response.data.data
        : {};
      setPerformanceColumns(payload.columns || []);
      setPerformanceRows(Array.isArray(payload.data) ? payload.data : []);
    } catch (error) {
      showToast("An error occurred while fetching performance report", "error");
    } finally {
      setLoading((prev) => ({ ...prev, performance: false }));
    }
  };

  const fetchAssessmentReport = async (
    filters: {
      participantId: string;
      startDate: string;
      endDate: string;
    } = assessmentFilters,
  ) => {
    if (!programId) return;

    setLoading((prev) => ({ ...prev, assessment: true }));
    try {
      const response = await reportsService.getAssessmentReport(programId, {
        participants: buildParticipantsPayload(filters.participantId),
        start_date: filters.startDate,
        end_date: filters.endDate,
      });

      if (!response.success) {
        showToast(
          response.error || "Failed to fetch assessment report",
          "error",
        );
        return;
      }

      const payload = response.data?.dates
        ? response.data
        : response.data?.data?.dates
        ? response.data.data
        : {};
      setAssessmentDates(Array.isArray(payload?.dates) ? payload.dates : []);
      setAssessmentParticipants(
        Array.isArray(payload?.participants) ? payload.participants : [],
      );
    } catch (error) {
      showToast("An error occurred while fetching assessment report", "error");
    } finally {
      setLoading((prev) => ({ ...prev, assessment: false }));
    }
  };

  const fetchTaskReport = async (filters: TaskFilters = taskFilters) => {
    if (!programId) return;

    setLoading((prev) => ({ ...prev, task: true }));
    try {
      const response = await reportsService.getTaskReport(programId, {
        content_ids: filters.contentIds.length > 0 ? filters.contentIds : ["all"],
        participant_ids: filters.participantIds.length > 0 ? filters.participantIds : ["all"],
        status: filters.status,
      });

      if (!response.success) {
        showToast(response.error || "Failed to fetch task report", "error");
        return;
      }

      const raw: any[] = Array.isArray(response.data?.records)
        ? response.data.records
        : Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
        ? response.data
        : [];
      const payload = raw.map((item: any, index: number) => {
        const name = item.participant?.name ?? item.participant_name ?? "";
        const matchedParticipant = taskParticipantOptions.find(
          (p) => p.name.trim().toLowerCase() === name.trim().toLowerCase(),
        );
        return {
          participant_id: matchedParticipant?.id ?? item.participant?.id ?? item.participant_id ?? index + 1,
          participant_name: name,
          completed_tasks: item.status?.completed ?? item.completed_tasks ?? 0,
          total_tasks: item.status?.total ?? item.total_tasks ?? 0,
          task_date: item.content?.date ?? item.task_date ?? "",
          content_title: item.content?.title ?? item.content_title ?? undefined,
        };
      });
      setTaskRows(payload);
      setSelectedParticipantIds([]);
    } catch (error) {
      showToast("An error occurred while fetching task report", "error");
    } finally {
      setLoading((prev) => ({ ...prev, task: false }));
    }
  };

  const openEmailModalForParticipants = (participantIds: number[]) => {
    const uniqueIds = Array.from(new Set(participantIds));
    const recipients = uniqueIds
      .map((participantId) => {
        const taskRow = taskRows.find(
          (item) => item.participant_id === participantId,
        );
        if (!taskRow) return null;
        const participantInfo = participantOptions.find(
          (participant) => participant.id === participantId,
        );
        return {
          id: participantId,
          name: taskRow.participant_name,
          email: participantInfo?.email || "",
        };
      })
      .filter(Boolean) as EmailRecipient[];

    if (recipients.length === 0) {
      showToast("Please select at least one participant", "error");
      return;
    }

    setEmailRecipients(recipients);
    setIsEmailModalOpen(true);
  };

  const handleSendTaskEmail = async (data: {
    participants: number[];
    subject: string;
    content: string;
  }) => {
    if (!programId) return;
    setIsSendingEmail(true);
    try {
      const response = await reportsService.sendTaskEmail(programId, {
        participants: data.participants,
        subject: data.subject,
        content: data.content,
      });

      if (response.success) {
        showToast("Email sent successfully", "success");
        setIsEmailModalOpen(false);
      } else {
        showToast(response.error || "Failed to send email", "error");
      }
    } catch (error) {
      showToast("An error occurred while sending email", "error");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const openWhatsappModalForParticipants = async (participantIds: number[]) => {
    const uniqueIds = Array.from(new Set(participantIds));

    const recipients = uniqueIds
      .map((participantId) => {
        const taskRow = taskRows.find(
          (item) => item.participant_id === participantId,
        );
        if (!taskRow) return null;

        const participantInfo = participantOptions.find(
          (participant) => participant.id === participantId,
        );

        return {
          id: participantId,
          name: taskRow.participant_name,
          email: participantInfo?.email || "",
        };
      })
      .filter(Boolean) as EmailRecipient[];

    if (recipients.length === 0) {
      showToast("Please select at least one participant", "error");
      return;
    }

    setWhatsappRecipients(recipients);
    setIsWhatsappModalOpen(true);

    if (whatsappTemplates.length > 0) return;
    setIsLoadingWhatsappTemplates(true);
    try {
      const res = await whatsappMessageService.listTemplates();
      if (res.success) {
        setWhatsappTemplates(res.data || []);
      } else {
        showToast(res.error || "Failed to fetch WhatsApp templates", "error");
      }
    } catch (error) {
      showToast("An error occurred while fetching WhatsApp templates", "error");
    } finally {
      setIsLoadingWhatsappTemplates(false);
    }
  };

  const handleSendTaskWhatsapp = async (data: {
    recipients: EmailRecipient[];
    participant_ids: number[];
    template_name: string;
  }) => {
    if (!programId) return;
    setIsSendingWhatsapp(true);

    try {
      const res = await whatsappMessageService.sendMessage({
        template_name: data.template_name,
        program_id: Number(programId),
        participant_ids: data.participant_ids,
      });

      if (res.success) {
        showToast("WhatsApp message sent successfully", "success");
        setIsWhatsappModalOpen(false);
      } else {
        showToast(res.error || "Failed to send WhatsApp message", "error");
      }
    } catch (error) {
      showToast("An error occurred while sending WhatsApp message", "error");
    } finally {
      setIsSendingWhatsapp(false);
    }
  };

  const handleToggleAllTaskParticipants = (checked: boolean) => {
    if (checked) {
      setSelectedParticipantIds(taskRows.map((row) => row.participant_id));
      return;
    }
    setSelectedParticipantIds([]);
  };

  const handleToggleTaskParticipant = (
    participantId: number,
    checked: boolean,
  ) => {
    setSelectedParticipantIds((previous) => {
      if (checked) return Array.from(new Set([...previous, participantId]));
      return previous.filter((id) => id !== participantId);
    });
  };

  const handleExportPerformance = () => {
    if (!performanceRows || performanceRows.length === 0) {
      showToast("No performance report data available to export", "info");
      return;
    }
    try {
      const exportData = performanceRows.map((row, index) => ({
        "Sl No": row.sl_no ?? index + 1,
        "Participant Name": row.participant_name ?? "-",
        "Date of Joining": row.date_of_joining ?? "-",
        "Team Name": row.team_name ?? "-",
        "Max Points": row.max_points ?? "-",
        "Points Earned": row.points_earned ?? "-",
        Rank: row.rank ?? "-",
        Badge: row.badge ?? "-",
        "Learning Engagement": row.learning_engagement ?? "-",
        "Learning Effectiveness": row.learning_effectiveness ?? "-",
        "Total Task": row.total_task ?? "-",
        "Tasks Completed": row.tasks_completed ?? "-",
        "Task Pending": row.task_pending ?? "-",
        "Number of Goals": row.number_of_goals ?? "-",
        "Goals Completed %": row.total_goals_completed_pct ?? "-",
        "Number of Habits": row.number_of_habits ?? "-",
        "Habits Completed %": row.total_habits_completed_pct ?? "-",
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Performance");
      XLSX.writeFile(
        workbook,
        `Performance_Report_${programId || "Export"}.xlsx`,
      );
      showToast("Performance report exported successfully!", "success");
    } catch (error) {
      console.error("Export Error:", error);
      showToast("Failed to export performance report", "error");
    }
  };

  const handleExportAssessment = () => {
    if (!assessmentParticipants || assessmentParticipants.length === 0) {
      showToast("No assessment report data available to export", "info");
      return;
    }
    try {
      const exportData = assessmentParticipants.map((participant, index) => {
        const row: Record<string, string | number> = {
          "Sl No": participant.sl_no || index + 1,
          "Participant Name": participant.participant_name || "-",
        };
        assessmentDates.forEach((dateBlock) => {
          const responseByDate = participant.responses?.find(
            (response) =>
              String(response.content_id) === String(dateBlock.content_id) &&
              response.date === dateBlock.date,
          );
          dateBlock.questions.forEach((question) => {
            const answer = responseByDate?.questions?.find(
              (item) => item.question_no === question.question_no,
            );
            const key = `${dateBlock.date} Q${question.question_no}`;
            row[key] = answer?.selected_option || "-";
          });
        });
        return row;
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Assessment");
      XLSX.writeFile(
        workbook,
        `Assessment_Report_${programId || "Export"}.xlsx`,
      );
      showToast("Assessment report exported successfully!", "success");
    } catch (error) {
      console.error("Export Error:", error);
      showToast("Failed to export assessment report", "error");
    }
  };

  const handleExportTask = () => {
    if (!taskRows || taskRows.length === 0) {
      showToast("No task report data available to export", "info");
      return;
    }
    try {
      const exportData = taskRows.map((row, index) => ({
        "Sl No": index + 1,
        "Participant Name": row.participant_name,
        "Date / Content": row.content_title ? `${row.task_date} - ${row.content_title}` : row.task_date,
        "Tasks Completed": row.completed_tasks,
        "Total Tasks": row.total_tasks,
        Status:
          row.completed_tasks >= row.total_tasks
            ? `${row.completed_tasks}/${row.total_tasks} (Completed)`
            : `${row.completed_tasks}/${row.total_tasks} (Pending)`,
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Task");
      XLSX.writeFile(workbook, `Task_Report_${programId || "Export"}.xlsx`);
      showToast("Task report exported successfully!", "success");
    } catch (error) {
      console.error("Export Error:", error);
      showToast("Failed to export task report", "error");
    }
  };

  useEffect(() => {
    if (!isReady || !programId) return;
    fetchParticipants();
  }, [isReady, programId]);

  useEffect(() => {
    if (!programStartDate && !programEndDate) return;
    setAssessmentFilters((prev) => ({
      ...prev,
      startDate: programStartDate || prev.startDate,
      endDate: programEndDate || prev.endDate,
    }));
  }, [programStartDate, programEndDate]);

  const togglePerformanceHeader = (headerLabel: string) => {
    setSelectedPerformanceHeaders((previous) =>
      previous.includes(headerLabel)
        ? previous.filter((item) => item !== headerLabel)
        : [...previous, headerLabel],
    );
  };

  const applyPerformanceFilters = (
    headers: string[] = selectedPerformanceHeaders,
  ) => {
    const selectedFields = PERFORMANCE_HEADER_OPTIONS.filter((option) =>
      headers.includes(option.label),
    ).map((option) => option.field);
    setFirstLoadFilterVisible((previous) => ({
      ...previous,
      performance: false,
    }));
    fetchPerformanceReport(selectedFields);
  };

  const applyAssessmentFilters = () => {
    setFirstLoadFilterVisible((previous) => ({
      ...previous,
      assessment: false,
    }));
    fetchAssessmentReport(assessmentFilters);
  };

  const applyTaskFilters = () => {
    setFirstLoadFilterVisible((previous) => ({ ...previous, task: false }));
    fetchTaskReport(taskFilters);
  };

  return (
    <div className={styles.container}>
      <Suspense fallback={<PageLoader />}>
        <ProgramInfoBar />
      </Suspense>

      <div className={styles.contentWrapper}>
        <div className={styles.tabContainer}>
          {REPORT_TABS.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.tab} ${
                activeTab === tab.id ? styles.activeTab : ""
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "performance" && firstLoadFilterVisible.performance && (
          <div className={styles.inlineHeaderSection}>
            <h3 className={styles.sectionTitle}>Select report headers</h3>
            <div className={styles.selectionGrid}>
              {PERFORMANCE_HEADER_OPTIONS.map((header) => {
                const isChecked = selectedPerformanceHeaders.includes(
                  header.label,
                );
                return (
                  <div
                    key={header.label}
                    className={styles.checkboxItem}
                    onClick={() => togglePerformanceHeader(header.label)}
                  >
                    <div
                      className={`${styles.checkbox} ${styles.checkboxFixed} ${
                        isChecked ? styles.checked : ""
                      }`}
                    >
                      {isChecked && (
                        <svg
                          width="12"
                          height="10"
                          viewBox="0 0 12 10"
                          fill="none"
                        >
                          <path
                            d="M1 5L4.5 8.5L11 1.5"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <span>{header.label}</span>
                  </div>
                );
              })}
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.unselectBtn}
                onClick={() => setSelectedPerformanceHeaders([])}
              >
                Unselect All
              </button>
              <button
                className={styles.generateBtn}
                onClick={() => applyPerformanceFilters()}
              >
                Generate Report
              </button>
            </div>
          </div>
        )}

        {activeTab === "performance" && !firstLoadFilterVisible.performance && (
          <PerformanceReportTab
            columns={performanceColumns}
            rows={performanceRows}
            loading={loading.performance}
            onOpenHeaders={() =>
              setModals((previous) => ({ ...previous, headers: true }))
            }
            onExport={handleExportPerformance}
          />
        )}

        {activeTab === "assessment" && firstLoadFilterVisible.assessment && (
          <div className={styles.inlineHeaderSection}>
            <h3 className={styles.sectionTitle}>Select report criteria</h3>
            <div className={styles.criteriaGrid}>
              <div className={styles.criteriaItem}>
                <label className={styles.inputLabel}>Participants</label>
                <div className={styles.selectWrapper}>
                  <select
                    className={styles.select}
                    value={assessmentFilters.participantId}
                    onChange={(event) =>
                      setAssessmentFilters((previous) => ({
                        ...previous,
                        participantId: event.target.value,
                      }))
                    }
                  >
                    <option value="all">All Participants</option>
                    {participantOptions.map((participant) => (
                      <option
                        key={participant.id}
                        value={String(participant.id)}
                      >
                        {participant.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles.criteriaItem}>
                <label className={styles.inputLabel}>Start Date</label>
                <div
                  className={styles.dateWrapper}
                  onClick={(e) => {
                    (
                      e.currentTarget.querySelector(
                        'input[type="date"]',
                      ) as HTMLInputElement | null
                    )?.showPicker?.();
                  }}
                >
                  <input
                    type="date"
                    className={styles.dateInput}
                    value={assessmentFilters.startDate}
                    min={programStartDate}
                    max={programEndDate}
                    onChange={(event) =>
                      setAssessmentFilters((previous) => ({
                        ...previous,
                        startDate: event.target.value,
                      }))
                    }
                  />
                  <span className={styles.calendarIcon} aria-hidden="true">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                  </span>
                </div>
              </div>
              <div className={styles.criteriaItem}>
                <label className={styles.inputLabel}>End Date</label>
                <div
                  className={styles.dateWrapper}
                  onClick={(e) => {
                    (
                      e.currentTarget.querySelector(
                        'input[type="date"]',
                      ) as HTMLInputElement | null
                    )?.showPicker?.();
                  }}
                >
                  <input
                    type="date"
                    className={styles.dateInput}
                    value={assessmentFilters.endDate}
                    min={programStartDate}
                    max={programEndDate}
                    onChange={(event) =>
                      setAssessmentFilters((previous) => ({
                        ...previous,
                        endDate: event.target.value,
                      }))
                    }
                  />
                  <span className={styles.calendarIcon} aria-hidden="true">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                  </span>
                </div>
              </div>
              <button
                className={styles.generateBtn}
                onClick={applyAssessmentFilters}
              >
                Generate Report
              </button>
            </div>
          </div>
        )}

        {activeTab === "assessment" && !firstLoadFilterVisible.assessment && (
          <AssessmentReportTab
            dates={assessmentDates}
            participants={assessmentParticipants}
            loading={loading.assessment}
            onOpenCriteria={() =>
              setModals((previous) => ({ ...previous, criteria: true }))
            }
            onExport={handleExportAssessment}
          />
        )}

        {activeTab === "task" && firstLoadFilterVisible.task && (
          <div className={styles.inlineHeaderSection}>
            <h3 className={styles.sectionTitle}>Select report criteria</h3>
            <TaskFilterRow
              taskFilters={taskFilters}
              onFiltersChange={setTaskFilters}
              contentOptions={contentOptions}
              participantOptions={taskParticipantOptions}
            />
            <div className={styles.modalFooter} style={{ marginTop: 24 }}>
              <button
                className={styles.generateBtn}
                onClick={applyTaskFilters}
                disabled={taskFilters.contentIds.length === 0 || taskFilters.participantIds.length === 0}
              >
                Generate Report
              </button>
            </div>
          </div>
        )}

        {activeTab === "task" && !firstLoadFilterVisible.task && (
          <TaskReportTab
            rows={taskRows}
            selectedParticipantIds={selectedParticipantIds}
            loading={loading.task}
            onToggleAll={handleToggleAllTaskParticipants}
            onToggleParticipant={handleToggleTaskParticipant}
            onOpenCriteria={() =>
              setModals((previous) => ({ ...previous, criteria: true }))
            }
            onSendEmailAll={() =>
              openEmailModalForParticipants(selectedParticipantIds)
            }
            onSendEmailSingle={(participantId) =>
              openEmailModalForParticipants([participantId])
            }
            onSendWhatsappAll={() =>
              void openWhatsappModalForParticipants(selectedParticipantIds)
            }
            onSendWhatsappSingle={(participantId) =>
              void openWhatsappModalForParticipants([participantId])
            }
            onExport={handleExportTask}
          />
        )}
      </div>

      <ModifyHeadersModal
        isOpen={modals.headers}
        initialSelectedHeaders={selectedPerformanceHeaders}
        onClose={() =>
          setModals((previous) => ({ ...previous, headers: false }))
        }
        onGenerate={(selectedHeaders) => {
          setSelectedPerformanceHeaders(selectedHeaders);
          setModals((previous) => ({ ...previous, headers: false }));
          applyPerformanceFilters(selectedHeaders);
        }}
      />

      <ModifyCriteriaModal
        isOpen={modals.criteria}
        variant={activeTab === "assessment" ? "assessment" : "task"}
        participantOptions={participantOptions}
        assessmentFilters={assessmentFilters}
        onAssessmentFiltersChange={setAssessmentFilters}
        taskFilters={taskFilters}
        onTaskFiltersChange={setTaskFilters}
        contentOptions={contentOptions}
        taskParticipantOptions={taskParticipantOptions}
        programStartDate={programStartDate}
        programEndDate={programEndDate}
        onClose={() =>
          setModals((previous) => ({ ...previous, criteria: false }))
        }
        onGenerate={() => {
          setModals((previous) => ({ ...previous, criteria: false }));
          if (activeTab === "assessment") applyAssessmentFilters();
          if (activeTab === "task") applyTaskFilters();
        }}
      />

      <SendEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        recipients={emailRecipients}
        allowMultipleRecipients
        isSending={isSendingEmail}
        onSend={handleSendTaskEmail}
      />

      <SendWhatsappModal
        isOpen={isWhatsappModalOpen}
        onClose={() => setIsWhatsappModalOpen(false)}
        recipients={whatsappRecipients}
        allowMultipleRecipients
        templates={whatsappTemplates}
        isLoadingTemplates={isLoadingWhatsappTemplates}
        isSending={isSendingWhatsapp}
        isTrial={isTrial}
        onSend={handleSendTaskWhatsapp}
      />
    </div>
  );
}

// ── Shared task filter row (inline section + ModifyCriteriaModal) ─────────────

interface TaskFilterRowProps {
  taskFilters: TaskFilters;
  onFiltersChange: React.Dispatch<React.SetStateAction<TaskFilters>>;
  contentOptions: ContentOption[];
  participantOptions: ParticipantOption[];
}

export function TaskFilterRow({
  taskFilters,
  onFiltersChange,
  contentOptions,
  participantOptions,
}: TaskFilterRowProps) {
  const multiContent = taskFilters.contentIds.length > 1;
  const multiParticipant = taskFilters.participantIds.length > 1;

  const contentMultiSelectOptions = contentOptions.map((c) => ({
    value: c.id,
    label: c.title,
    datePrefix: formatContentDate(c.date),
  }));

  const participantMultiSelectOptions = participantOptions.map((p) => ({
    value: String(p.id),
    label: p.name,
  }));

  const handleContentChange = (ids: string[]) => {
    onFiltersChange((prev) => ({
      ...prev,
      contentIds: ids,
      // switching to multi-content → force single participant
      participantIds: ids.length > 1 && prev.participantIds.length > 1
        ? prev.participantIds.slice(0, 1)
        : prev.participantIds,
    }));
  };

  const handleParticipantChange = (ids: string[]) => {
    onFiltersChange((prev) => ({
      ...prev,
      participantIds: ids,
      // switching to multi-participant → force single content
      contentIds: ids.length > 1 && prev.contentIds.length > 1
        ? prev.contentIds.slice(0, 1)
        : prev.contentIds,
    }));
  };

  return (
    <div className={styles.criteriaGrid}>
      <div className={styles.criteriaItem}>
        <label className={styles.inputLabel}>Choose Date/Content</label>
        <CheckboxMultiSelect
          options={contentMultiSelectOptions}
          selected={taskFilters.contentIds}
          onChange={handleContentChange}
          placeholder="Select"
          singleOnly={multiParticipant}
        />
      </div>
      <div className={styles.criteriaItem}>
        <label className={styles.inputLabel}>Choose Participants</label>
        <CheckboxMultiSelect
          options={participantMultiSelectOptions}
          selected={taskFilters.participantIds}
          onChange={handleParticipantChange}
          placeholder="All"
          singleOnly={multiContent}
        />
      </div>
      <div className={styles.criteriaItem}>
        <label className={styles.inputLabel}>Task Status</label>
        <div className={styles.selectWrapper}>
          <select
            className={styles.select}
            value={taskFilters.status}
            onChange={(e) =>
              onFiltersChange((prev) => ({
                ...prev,
                status: e.target.value as TaskFilters["status"],
              }))
            }
          >
            <option value="any">All</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>
    </div>
  );
}
