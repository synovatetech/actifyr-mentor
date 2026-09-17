"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useProgramId } from "@/hooks/useProgramId";
import styles from "@/styles/goals-habits.module.css";
import Image from "next/image";
import { goalsService } from "@/services/api/goals.service";
import { habitsService } from "@/services/api/habits.service";
import type { Goal } from "@/services/api/goals.service";
import type { Habit } from "@/services/api/habits.service";
import { ProgramInfoBar } from "@/components/features/program-admin/ProgramInfoBar";
import { PageLoader } from "@/components/ui/Loader";
import GoalDetailsModal from "@/components/features/program-admin/GoalDetailsModal";
import type { GoalDetails } from "@/components/features/program-admin/GoalDetailsModal";
import HabitDetailsModal from "@/components/features/program-admin/HabitDetailsModal";
import type { HabitDetails } from "@/components/features/program-admin/HabitDetailsModal";
import HabitProgressModal from "@/components/features/program-admin/HabitProgressModal";
import type { HabitProgress } from "@/components/features/program-admin/HabitProgressModal";
import GoalsTable from "@/components/features/program-admin/GoalsTable";
import HabitsTable from "@/components/features/program-admin/HabitsTable";
import type { GoalHabitRow } from "@/components/features/program-admin/GoalHabitTable.types";
import { useToast } from "@/context/ToastContext";
import * as XLSX from "xlsx";
import { useProgramStore } from "@/store/programStore";

const normalizeStatus = (rawStatus: string | undefined): GoalHabitRow["status"] => {
  if (!rawStatus) return "";
  const normalized = rawStatus.toLowerCase();
  if (normalized === "new") return "New";
  if (normalized === "updated") return "Updated";
  if (normalized === "opened") return "Opened";
  return "";
};

const formatDate = (value?: string, tz?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(tz ? { timeZone: tz } : {}),
  });
};

const formatDateTime = (value?: string, tz?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    ...(tz ? { timeZone: tz } : {}),
  });
};

const mapGoal = (item: Goal): GoalHabitRow => ({
  id: Number(item.id) || 0,
  name: item.user_name || "System Generated",
  title: item.title || "Untitled",
  description: item.description || "",
  status: normalizeStatus(item.status || item.read_status),
  progress: typeof item.progress === "number" ? `${item.progress}%` : "-",
  createdAt: item.created_at || "",
  originalData: { ...item } as Record<string, unknown>,
});

const mapHabit = (item: Habit): GoalHabitRow => ({
  id: Number(item.id) || 0,
  name: item.participant_name || item.user_name || "System Generated",
  email: item.participant_email || "",
  title: item.title || "Untitled",
  description: item.description || "",
  status: normalizeStatus(item.status || item.read_status),
  progress:
    typeof item.progress_count === "number" ? `${item.progress_count}%` : "-",
  createdAt: item.created_at || "",
  originalData: { ...item } as Record<string, unknown>,
});

function GoalsHabitsContent() {
  const { programId } = useProgramId();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const timeZone = useProgramStore((s) => s.programDetails?.timeZone);

  const [activeTab, setActiveTab] = useState<"Goals" | "Habits">("Goals");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(id);
  }, [searchTerm]);

  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [selectedHabitId, setSelectedHabitId] = useState<number | null>(null);
  const [selectedProgressId, setSelectedProgressId] = useState<number | null>(null);

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);

  // ── List queries ──────────────────────────────────────────────

  const { data: goalsData = [], isLoading: goalsLoading } = useQuery({
    queryKey: ["participant-goals", programId, debouncedSearch],
    queryFn: async () => {
      const res = await goalsService.listParticipant(programId!, debouncedSearch);
      if (!res.success) throw new Error(res.error || "Failed to fetch goals");
      return Array.isArray(res.data) ? res.data.map(mapGoal) : [];
    },
    enabled: !!programId && activeTab === "Goals",
  });

  const { data: habitsData = [], isLoading: habitsLoading } = useQuery({
    queryKey: ["participant-habits", programId, debouncedSearch],
    queryFn: async () => {
      const res = await habitsService.listParticipant(programId!, debouncedSearch);
      if (!res.success) throw new Error(res.error || "Failed to fetch habits");
      return Array.isArray(res.data) ? res.data.map(mapHabit) : [];
    },
    enabled: !!programId && activeTab === "Habits",
  });

  const loading = activeTab === "Goals" ? goalsLoading : habitsLoading;
  const data = activeTab === "Goals" ? goalsData : habitsData;

  // ── Detail queries ────────────────────────────────────────────

  const { data: goalDetailRaw, isLoading: goalLoading } = useQuery({
    queryKey: ["goal-detail", selectedGoalId],
    queryFn: async () => {
      const res = await goalsService.getParticipantGoal(selectedGoalId!);
      if (!res.success) throw new Error(res.error || "Failed to fetch goal details");
      return res.data;
    },
    enabled: !!selectedGoalId,
    staleTime: 0,
  });

  const { data: habitDetailRaw, isLoading: habitLoading } = useQuery({
    queryKey: ["habit-detail", selectedHabitId],
    queryFn: async () => {
      const res = await habitsService.getParticipantHabit(selectedHabitId!);
      if (!res.success) throw new Error(res.error || "Failed to fetch habit details");
      return res.data;
    },
    enabled: !!selectedHabitId,
    staleTime: 0,
  });

  const { data: progressDetailRaw, isLoading: progressLoading } = useQuery({
    queryKey: ["habit-progress", selectedProgressId],
    queryFn: async () => {
      const res = await habitsService.getProgress(selectedProgressId!);
      if (!res.success) throw new Error(res.error || "Failed to fetch habit progress");
      return res.data;
    },
    enabled: !!selectedProgressId,
    staleTime: 0,
  });

  // ── Map raw API data → modal shapes ──────────────────────────

  const selectedGoal: GoalDetails | null = goalDetailRaw
    ? {
        id: Number(goalDetailRaw.id),
        title: goalDetailRaw.title || "-",
        description: goalDetailRaw.description || "-",
        targetDate: formatDate(goalDetailRaw.target_date, timeZone),
        remark: goalDetailRaw.remark || "-",
        progress:
          typeof goalDetailRaw.progress === "number" ? goalDetailRaw.progress : 0,
        createdAt: formatDateTime(goalDetailRaw.created_at, timeZone),
      }
    : null;

  const selectedHabit: HabitDetails | null = habitDetailRaw
    ? {
        id: Number(habitDetailRaw.id),
        title: habitDetailRaw.title || "-",
        description: habitDetailRaw.description || "-",
        startDate: formatDate(habitDetailRaw.start_date, timeZone),
        endDate: formatDate(habitDetailRaw.end_date, timeZone),
        frequency: Array.isArray(habitDetailRaw.frequency)
          ? habitDetailRaw.frequency
          : [],
        createdAt: formatDateTime(habitDetailRaw.created_at, timeZone),
      }
    : null;

  const selectedProgress: HabitProgress | null = progressDetailRaw
    ? {
        startDate: progressDetailRaw.start_date || "",
        endDate: progressDetailRaw.end_date || "",
        weeks: Array.isArray(progressDetailRaw.weeks)
          ? progressDetailRaw.weeks
          : [],
      }
    : null;

  // ── Handlers ──────────────────────────────────────────────────

  const handleViewGoalDetails = (item: GoalHabitRow) => {
    setSelectedGoalId(item.id);
    setIsGoalModalOpen(true);
  };

  const handleViewHabitDetails = (item: GoalHabitRow) => {
    setSelectedHabitId(item.id);
    setIsHabitModalOpen(true);
  };

  const handleViewProgress = (item: GoalHabitRow) => {
    setSelectedProgressId(item.id);
    setIsProgressModalOpen(true);
  };

  const closeGoalModal = () => {
    setIsGoalModalOpen(false);
    setSelectedGoalId(null);
    // Refetch list so server-updated read_status is reflected
    queryClient.invalidateQueries({ queryKey: ["participant-goals", programId] });
  };

  const closeHabitModal = () => {
    setIsHabitModalOpen(false);
    setSelectedHabitId(null);
    queryClient.invalidateQueries({ queryKey: ["participant-habits", programId] });
  };

  const closeProgressModal = () => {
    setIsProgressModalOpen(false);
    setSelectedProgressId(null);
    queryClient.invalidateQueries({ queryKey: ["participant-habits", programId] });
  };

  if (!programId) {
    return (
      <div className={styles.container}>
        Please select a program to view goals and habits.
      </div>
    );
  }

  const filteredData = data;

  const handleExport = () => {
    if (!filteredData || filteredData.length === 0) {
      showToast(`No ${activeTab.toLowerCase()} data available to export`, "info");
      return;
    }
    try {
      const exportData = filteredData.map((item, index) => ({
        "Sl No": index + 1,
        "Participant Name": item.name,
        Title: item.title,
        Description: item.description,
        Status: item.status || "-",
        Progress: item.progress || "-",
        "Created At": formatDateTime(item.createdAt, timeZone),
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, activeTab);
      XLSX.writeFile(
        workbook,
        `${activeTab}_Program_${programId || "Export"}.xlsx`,
      );
      showToast(`${activeTab} exported successfully!`, "success");
    } catch (error) {
      console.error("Export Error:", error);
      showToast(`Failed to export ${activeTab.toLowerCase()} to Excel`, "error");
    }
  };

  return (
    <div className={styles.container}>
      <ProgramInfoBar />

      <div className={styles.contentWrapper}>
        <div className={styles.tabContainer}>
          <div className={styles.tabsLeft}>
            <button
              className={`${styles.tab} ${activeTab === "Goals" ? styles.activeTab : ""}`}
              onClick={() => setActiveTab("Goals")}
            >
              Goals
            </button>
            <button
              className={`${styles.tab} ${activeTab === "Habits" ? styles.activeTab : ""}`}
              onClick={() => setActiveTab("Habits")}
            >
              Habits
            </button>
          </div>
        </div>

        <div className={styles.actionRow}>
          <div className={styles.searchBox}>
            <input
              className={styles.searchInput}
              placeholder="Search by Name or Email Address"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <button
              className={styles.searchBtn}
              type="button"
              onClick={() => setDebouncedSearch(searchTerm)}
            >
              Search
            </button>
          </div>
          <button className={styles.exportBtn} type="button" onClick={handleExport}>
            <Image src="/excel-icon.svg" alt="Export" width={20} height={20} />
            Export
          </button>
        </div>

        <div className={styles.tableCard}>
          {loading ? (
            <PageLoader />
          ) : activeTab === "Goals" ? (
            <GoalsTable data={filteredData} onViewDetails={handleViewGoalDetails} />
          ) : (
            <HabitsTable
              data={filteredData}
              onViewDetails={handleViewHabitDetails}
              onViewProgress={handleViewProgress}
            />
          )}
        </div>
      </div>

      <GoalDetailsModal
        isOpen={isGoalModalOpen}
        loading={goalLoading}
        details={selectedGoal}
        type="Goals"
        onClose={closeGoalModal}
      />

      <HabitDetailsModal
        isOpen={isHabitModalOpen}
        loading={habitLoading}
        details={selectedHabit}
        onClose={closeHabitModal}
      />

      <HabitProgressModal
        isOpen={isProgressModalOpen}
        loading={progressLoading}
        progress={selectedProgress}
        onClose={closeProgressModal}
      />
    </div>
  );
}

export default function GoalsContent() {
  return (
    <Suspense fallback={<PageLoader />}>
      <GoalsHabitsContent />
    </Suspense>
  );
}
