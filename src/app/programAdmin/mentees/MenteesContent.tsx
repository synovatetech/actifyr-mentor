"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import styles from "@/styles/participants.module.css";
import Image from "next/image";
import { ProgramInfoBar } from "@/components/features/program-admin/ProgramInfoBar";
import { PageLoader } from "@/components/ui/Loader";
import { participantsService } from "@/services/api/participants.service";
import { useProgramId } from "@/hooks/useProgramId";
import { useToast } from "@/context/ToastContext";
import * as XLSX from "xlsx";
import ListSkeletonLoader from "@/components/common/ListSkeletonLoader";

const DEFAULT_PROGRAM_STATS: Record<string, number> = {
  max_leaderboard_points: 0,
  max_engagement_points: 0,
  max_effectiveness_points: 0,
  total_tasks: 0,
  total_general_tasks: 0,
  total_poi_tasks: 0,
  total_poa_tasks: 0,
  total_pow_tasks: 0,
};

const mapParticipants = (items: any[]) =>
  items.map((p: any, idx: number) => ({
    ...p,
    slNo: String(idx + 1).padStart(2, "0"),
    participantId: String(p.user_id ?? p.id ?? p.participant_id ?? ""),
    name: p.participant_name || p.name || "N/A",
    email: p.email || "N/A",
    team: p.team_name || p.team || "None",
    engagement:
      p.learning_engagement_score != null
        ? `${p.learning_engagement_score}%`
        : p.engagement_score || p.engagement || "0%",
    effectiveness:
      p.learning_effectiveness_score != null
        ? `${p.learning_effectiveness_score}%`
        : p.effectiveness_score || p.effectiveness || "0%",
    tasks: p.total_task_done ?? p.tasks_done ?? 0,
    pow: p.pow_completed ?? p.pow_count ?? 0,
    pol: p.poi_completed ?? p.pol_count ?? 0,
    poa: p.poa_completed ?? p.poa_count ?? 0,
    general: p.general_completed ?? p.general_count ?? 0,
    rank: p.rank || idx + 1,
    points: p.total_points ?? p.points ?? 0,
    badge: p.badge || "None",
  }));

const computeStats = (items: any[]) => {
  const totalCount = items.length;
  const bronzeCount = items.filter((p: any) => p.badge?.toLowerCase() === "bronze").length;
  const silverCount = items.filter((p: any) => p.badge?.toLowerCase() === "silver").length;
  const goldCount = items.filter((p: any) => p.badge?.toLowerCase() === "gold").length;

  return {
    totalParticipants: totalCount,
    totalTasks: items.reduce((acc: number, curr: any) => acc + (curr.total_task_done ?? curr.tasks_done ?? 0), 0),
    pow: items.reduce((acc: number, curr: any) => acc + (curr.pow_completed ?? curr.pow_count ?? 0), 0),
    pol: items.reduce((acc: number, curr: any) => acc + (curr.poi_completed ?? curr.pol_count ?? 0), 0),
    poa: items.reduce((acc: number, curr: any) => acc + (curr.poa_completed ?? curr.poa_count ?? 0), 0),
    general: items.reduce((acc: number, curr: any) => acc + (curr.general_completed ?? curr.general_count ?? 0), 0),
    bronze: `${bronzeCount} (${totalCount ? Math.round((bronzeCount / totalCount) * 100) : 0}%)`,
    silver: `${silverCount} (${totalCount ? Math.round((silverCount / totalCount) * 100) : 0}%)`,
    gold: `${goldCount} (${totalCount ? Math.round((goldCount / totalCount) * 100) : 0}%)`,
  };
};

export default function MenteesContent() {
  const { programId, isReady } = useProgramId();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"my" | "all">("my");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const tableCardRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const { data: queryData, isLoading: loading } = useQuery({
    queryKey: ["program-participants", programId, activeTab, debouncedSearch],
    queryFn: async () => {
      const res = await participantsService.list(programId!, {
        search: debouncedSearch,
        menteesOnly: activeTab === "my",
      });
      if (!res.success) throw new Error(res.error || "Failed to fetch participants");
      return {
        participants: mapParticipants(res.data),
        programStats: res.programStats ?? DEFAULT_PROGRAM_STATS,
      };
    },
    enabled: !!programId && isReady,
  });

  const participants = useMemo(() => queryData?.participants ?? [], [queryData]);
  const programStats = queryData?.programStats ?? DEFAULT_PROGRAM_STATS;
  const stats = useMemo(() => computeStats(participants), [participants]);

  const handleExport = () => {
    if (!participants || participants.length === 0) {
      showToast("No participants available to export", "info");
      return;
    }

    try {
      const exportData = participants.map((p) => ({
        "Sl No": p.slNo,
        "Student Name": p.name,
        "Email Address": p.email,
        Team: p.team,
        "Engagement Score": p.engagement,
        "Effectiveness Score": p.effectiveness,
        "Tasks Done": p.tasks,
        PoW: p.pow,
        Pol: p.pol,
        PoA: p.poa,
        General: p.general,
        Rank: p.rank,
        Points: p.points,
        Badge: p.badge,
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Participants");

      XLSX.writeFile(
        workbook,
        `Participants_Program_${programId || "Export"}.xlsx`,
      );
      showToast("Participants exported successfully!", "success");
    } catch (error) {
      console.error("Export Error:", error);
      showToast("Failed to export participants to Excel", "error");
    }
  };

  return (
    <div className={styles.container}>
      {/* Program Info Bar */}
      <Suspense fallback={<PageLoader />}>
        <ProgramInfoBar />
      </Suspense>

      <div className={styles.contentWrapper}>
        <h2
          style={{ fontSize: "18px", fontWeight: "600", marginBottom: "24px" }}
        >
          Mentees
        </h2>

        <>
          {/* Stats Grid */}
          <div className={styles.statsGrid}>
            <div className={`${styles.statCard} ${styles.participantsCount}`}>
              <span className={styles.statLabel}>Participants</span>
              <span className={styles.statValue}>
                {stats.totalParticipants}
              </span>
            </div>
            <div className={`${styles.statCard} ${styles.tasksCount}`}>
              <span className={styles.statLabel}>Total Tasks</span>
              <span className={styles.statValue}>{programStats.total_tasks || stats.totalTasks}</span>
            </div>

            <div className={styles.statCard}>
              <div className={styles.multiStats}>
                <div className={styles.subStat}>
                  <span className={styles.subStatLabel}>PoW</span>
                  <span className={styles.subStatValue}>{programStats.total_pow_tasks || stats.pow}</span>
                </div>
                <div className={styles.subStat}>
                  <span className={styles.subStatLabel}>PoI</span>
                  <span className={styles.subStatValue}>{programStats.total_poi_tasks || stats.pol}</span>
                </div>
                <div className={styles.subStat}>
                  <span className={styles.subStatLabel}>PoA</span>
                  <span className={styles.subStatValue}>{programStats.total_poa_tasks || stats.poa}</span>
                </div>
                <div className={styles.subStat}>
                  <span className={styles.subStatLabel}>General</span>
                  <span className={styles.subStatValue}>{programStats.total_general_tasks || stats.general}</span>
                </div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.multiStats}>
                <div className={styles.subStat}>
                  <span className={styles.subStatLabel}>Leaderboard Pts</span>
                  <span className={styles.subStatValue}>{programStats.max_leaderboard_points}</span>
                </div>
                <div className={styles.subStat}>
                  <span className={styles.subStatLabel}>Engagement Pts</span>
                  <span className={styles.subStatValue}>{programStats.max_engagement_points}</span>
                </div>
                <div className={styles.subStat}>
                  <span className={styles.subStatLabel}>Effectiveness Pts</span>
                  <span className={styles.subStatValue}>{programStats.max_effectiveness_points}</span>
                </div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.multiStats}>
                <div className={styles.subStat}>
                  <span className={styles.subStatLabel}>Bronze</span>
                  <span className={styles.subStatValue}>{stats.bronze}</span>
                </div>
                <div className={styles.subStat}>
                  <span className={styles.subStatLabel}>Silver</span>
                  <span className={styles.subStatValue}>{stats.silver}</span>
                </div>
                <div className={styles.subStat}>
                  <span className={styles.subStatLabel}>Gold</span>
                  <span className={styles.subStatValue}>{stats.gold}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.tabContainer}>
            <button
              type="button"
              className={`${styles.tab} ${activeTab === "my" ? styles.activeTab : ""}`}
              onClick={() => setActiveTab("my")}
            >
              My Mentees
            </button>
            <button
              type="button"
              className={`${styles.tab} ${activeTab === "all" ? styles.activeTab : ""}`}
              onClick={() => setActiveTab("all")}
            >
              All Participants
            </button>
          </div>

          <div className={styles.controlsRow}>
            <div className={styles.searchBox}>
              <input
                className={styles.searchInput}
                placeholder="Search by Name or Email Address"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <button className={styles.searchBtn} type="button">
                Search
              </button>
            </div>
            <button className={styles.exportBtn} onClick={handleExport}>
              <Image src="/excel-icon.svg" alt="Excel" width={18} height={18} />
              Export
            </button>
          </div>

          {/* Participants Table */}
          <style
            dangerouslySetInnerHTML={{
              __html: `
                        .customScrollbar { scrollbar-width: auto !important; }
                        .customScrollbar::-webkit-scrollbar { display: block !important; height: 10px !important; width: 10px !important; -webkit-appearance: none !important; }
                        .customScrollbar::-webkit-scrollbar-track { display: block !important; background: #F3F4F6 !important; border-radius: 4px; border: 2px solid white; }
                        .customScrollbar::-webkit-scrollbar-thumb { display: block !important; background: #D1D5DB !important; border-radius: 4px; }
                        .customScrollbar::-webkit-scrollbar-thumb:hover { background: #9CA3AF !important; }
                        `,
            }}
          />
          <div
            ref={tableCardRef}
            className={`${styles.tableCard} customScrollbar`}
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.slNo}>Sl No</th>
                  <th>Student Name</th>
                  <th>Email Address</th>
                  <th>Team</th>
                  <th>Engagement Score</th>
                  <th>Effectiveness Score</th>
                  <th>Tasks Done</th>
                  <th>PoW</th>
                  <th>Pol</th>
                  <th>PoA</th>
                  <th>General</th>
                  <th>Rank</th>
                  <th>Points</th>
                  <th>Badge</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={14}>
                      <ListSkeletonLoader rows={8} />
                    </td>
                  </tr>
                ) : participants.length === 0 ? (
                  <tr>
                    <td colSpan={14} className={styles.emptyState}>
                      <div className={styles.emptyStateInner}>
                        {activeTab === "my"
                          ? "No mentees assigned yet — ask your program administrator."
                          : "No participants found."}
                      </div>
                    </td>
                  </tr>
                ) : (
                  participants.map((row) => (
                    <tr key={row.slNo}>
                      <td className={styles.slNo}>{row.slNo}</td>
                      <td className={styles.studentName}>{row.name}</td>
                      <td>{row.email}</td>
                      <td>{row.team}</td>
                      <td>{row.engagement}</td>
                      <td>{row.effectiveness}</td>
                      <td>
                        <div className={styles.pills}>{row.tasks}</div>
                      </td>
                      <td>{row.pow}</td>
                      <td>{row.pol}</td>
                      <td>{row.poa}</td>
                      <td>{row.general}</td>
                      <td>
                        <b>{row.rank}</b>
                      </td>
                      <td>{row.points}</td>
                      <td className={styles.badgeCell}>{row.badge}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      </div>
    </div>
  );
}
