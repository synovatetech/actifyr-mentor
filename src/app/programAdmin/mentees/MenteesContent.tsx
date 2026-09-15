"use client";

import React, { Suspense } from "react";
import styles from "@/styles/participants.module.css";
import Image from "next/image";
import { ProgramInfoBar } from "@/components/features/program-admin/ProgramInfoBar";
import { PageLoader } from "@/components/ui/Loader";
import { participantsService } from "@/services/api/participants.service";
import { reportsService } from "@/services/api/reports.service";
import { useProgramId } from "@/hooks/useProgramId";
import { useState, useEffect } from "react";
import { useToast } from "@/context/ToastContext";
import * as XLSX from "xlsx";
import SendEmailModal, {
  EmailRecipient,
} from "@/components/features/program-admin/SendEmailModal";
import SendWhatsappModal from "@/components/features/program-admin/SendWhatsappModal";
import RewardCustomPointsModal from "@/components/features/program-admin/RewardCustomPointsModal";
import { useClientAdmin } from "@/hooks/useClientAdmin";
import { createPortal } from "react-dom";
import { scoringService } from "@/services/api/scoring.service";
import {
  whatsappMessageService,
  type WhatsappTemplate,
} from "@/services/api/whatsappMessage.service";
import ListSkeletonLoader from "@/components/common/ListSkeletonLoader";

export default function MenteesContent() {
  interface CustomPointTemplate {
    id: string;
    name: string;
    maxPoints: number;
  }

  const { programId, isReady } = useProgramId();
  const { showToast } = useToast();
  const { isTrial } = useClientAdmin();
  const [activeTab, setActiveTab] = useState<"my" | "all">("my");
  const [participants, setParticipants] = useState<any[]>([]);
  const [customPointTemplates, setCustomPointTemplates] = useState<
    CustomPointTemplate[]
  >([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState<
    string | null
  >(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isWhatsappModalOpen, setIsWhatsappModalOpen] = useState(false);
  const [isCustomPointsModalOpen, setIsCustomPointsModalOpen] = useState(false);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<number[]>(
    [],
  );
  const [emailRecipients, setEmailRecipients] = useState<EmailRecipient[]>([]);
  const [whatsappRecipients, setWhatsappRecipients] = useState<EmailRecipient[]>(
    [],
  );
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingWhatsapp, setIsSendingWhatsapp] = useState(false);
  const [isLoadingWhatsappTemplates, setIsLoadingWhatsappTemplates] =
    useState(false);
  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsappTemplate[]>(
    [],
  );
  const [isRewardingPoints, setIsRewardingPoints] = useState(false);
  const [menuParticipantId, setMenuParticipantId] = useState<string | null>(
    null,
  );
  const menuRef = React.useRef<HTMLDivElement>(null);
  const tableCardRef = React.useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [stats, setStats] = useState<any>({
    totalParticipants: 0,
    totalTasks: 0,
    pow: 0,
    pol: 0,
    poa: 0,
    general: 0,
    bronze: "0 (0%)",
    silver: "0 (0%)",
    gold: "0 (0%)",
  });
  const [programStats, setProgramStats] = useState<Record<string, number>>({
    max_leaderboard_points: 0,
    max_engagement_points: 0,
    max_effectiveness_points: 0,
    total_tasks: 0,
    total_general_tasks: 0,
    total_poi_tasks: 0,
    total_poa_tasks: 0,
    total_pow_tasks: 0,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
        setMenuParticipantId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleMenu = (
    e: React.MouseEvent<HTMLDivElement>,
    id: string,
    participantId: string,
  ) => {
    e.stopPropagation();
    if (openMenuId === id) {
      setOpenMenuId(null);
      setMenuPosition(null);
      setMenuParticipantId(null);
      return;
    }

    const trigger = e.currentTarget.getBoundingClientRect();
    setMenuPosition({
      top: trigger.bottom + 8,
      left: trigger.right - 150,
    });
    setMenuParticipantId(participantId);
    setOpenMenuId(id);
  };

  useEffect(() => {
    if (!openMenuId) return;

    const closeMenuOnViewportChange = () => {
      setOpenMenuId(null);
      setMenuPosition(null);
      setMenuParticipantId(null);
    };

    window.addEventListener("scroll", closeMenuOnViewportChange, true);
    window.addEventListener("resize", closeMenuOnViewportChange);
    tableCardRef.current?.addEventListener("scroll", closeMenuOnViewportChange);

    return () => {
      window.removeEventListener("scroll", closeMenuOnViewportChange, true);
      window.removeEventListener("resize", closeMenuOnViewportChange);
      tableCardRef.current?.removeEventListener(
        "scroll",
        closeMenuOnViewportChange,
      );
    };
  }, [openMenuId]);

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

  const getParticipantNumericId = (participant: any): number | null => {
    const candidate = Number(
      participant?.participantId ??
        participant?.participant_id ??
        participant?.user_id ??
        participant?.id,
    );
    if (!Number.isFinite(candidate) || candidate <= 0) return null;
    return candidate;
  };

  const mapStats = (items: any[]) => {
    const totalCount = items.length;
    const bronzeCount = items.filter(
      (p: any) => p.badge?.toLowerCase() === "bronze",
    ).length;
    const silverCount = items.filter(
      (p: any) => p.badge?.toLowerCase() === "silver",
    ).length;
    const goldCount = items.filter(
      (p: any) => p.badge?.toLowerCase() === "gold",
    ).length;

    setStats({
      totalParticipants: totalCount,
      totalTasks: items.reduce(
        (acc: number, curr: any) =>
          acc + (curr.total_task_done ?? curr.tasks_done ?? 0),
        0,
      ),
      pow: items.reduce(
        (acc: number, curr: any) =>
          acc + (curr.pow_completed ?? curr.pow_count ?? 0),
        0,
      ),
      pol: items.reduce(
        (acc: number, curr: any) =>
          acc + (curr.poi_completed ?? curr.pol_count ?? 0),
        0,
      ),
      poa: items.reduce(
        (acc: number, curr: any) =>
          acc + (curr.poa_completed ?? curr.poa_count ?? 0),
        0,
      ),
      general: items.reduce(
        (acc: number, curr: any) =>
          acc + (curr.general_completed ?? curr.general_count ?? 0),
        0,
      ),
      bronze: `${bronzeCount} (${totalCount ? Math.round((bronzeCount / totalCount) * 100) : 0}%)`,
      silver: `${silverCount} (${totalCount ? Math.round((silverCount / totalCount) * 100) : 0}%)`,
      gold: `${goldCount} (${totalCount ? Math.round((goldCount / totalCount) * 100) : 0}%)`,
    });
  };

  const fetchParticipants = async (search?: string) => {
    if (!programId) return;
    setLoading(true);
    try {
      const participantsRes = await participantsService.list(programId, search);
      if (participantsRes.success) {
        setParticipants(mapParticipants(participantsRes.data));
        mapStats(participantsRes.data);
        if (participantsRes.programStats) {
          setProgramStats(participantsRes.programStats);
        }
      } else {
        showToast(
          participantsRes.error || "Failed to fetch participants",
          "error",
        );
      }
    } catch (err) {
      showToast("An error occurred while fetching participants", "error");
    } finally {
      setLoading(false);
    }
  };

  const buildRecipientsFromIds = (participantIds: number[]): EmailRecipient[] => {
    const uniqueIds = Array.from(new Set(participantIds));
    return uniqueIds
      .map((participantId) => {
        const row = participants.find(
          (item) => getParticipantNumericId(item) === participantId,
        );
        if (!row) return null;
        return {
          id: participantId,
          name: row.name || "Participant",
          email: row.email || "",
        };
      })
      .filter(Boolean) as EmailRecipient[];
  };

  const fetchData = async () => {
    if (!programId) return;
    setLoading(true);
    try {
      const [participantsRes, customPointsRes] = await Promise.all([
        participantsService.list(programId),
        scoringService.listCustomPoints(programId),
      ]);

      if (participantsRes.success) {
        setParticipants(mapParticipants(participantsRes.data));
        mapStats(participantsRes.data);
        if (participantsRes.programStats) {
          setProgramStats(participantsRes.programStats);
        }
      } else {
        showToast(
          participantsRes.error || "Failed to fetch participants",
          "error",
        );
      }

      if (customPointsRes.success) {
        setCustomPointTemplates(
          customPointsRes.data.map((item: any, idx: number) => ({
            id: String(item.id ?? item.custom_point_id ?? idx + 1),
            name: item.title || item.name || "Custom Point",
            maxPoints: Number(item.max_point ?? item.maxPoints ?? 0),
          })),
        );
      } else {
        showToast(
          customPointsRes.error || "Failed to fetch custom point templates",
          "error",
        );
      }
    } catch (err) {
      showToast("An error occurred while fetching participants data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isReady && programId) {
      fetchData();
    }
  }, [isReady, programId]);

  useEffect(() => {
    if (!isReady || !programId) return;
    const timeoutId = setTimeout(() => {
      void fetchParticipants(searchTerm);
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, isReady, programId]);

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

  const openEmailModal = (row: any) => {
    const participantIdNumber = Number(row.participantId ?? row.participant_id ?? row.id);
    const safeId = Number.isFinite(participantIdNumber) ? participantIdNumber : 0;
    setEmailRecipients([
      {
        id: safeId,
        name: row.name || "Participant",
        email: row.email || "",
      },
    ]);
    setIsEmailModalOpen(true);
  };

  const openBulkEmailModal = (participantIds: number[]) => {
    const recipients = buildRecipientsFromIds(participantIds);
    if (recipients.length === 0) {
      showToast("Please select at least one participant", "error");
      return;
    }
    setEmailRecipients(recipients);
    setIsEmailModalOpen(true);
  };

  const openWhatsappModal = async (row: any) => {
    const participantIdNumber = Number(
      row.participantId ?? row.participant_id ?? row.id,
    );
    const safeId = Number.isFinite(participantIdNumber) ? participantIdNumber : 0;
    const recipient = {
      id: safeId,
      name: row.name || "Participant",
      email: row.email || "",
    };
    setWhatsappRecipients([recipient]);
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

  const openBulkWhatsappModal = async (participantIds: number[]) => {
    const recipients = buildRecipientsFromIds(participantIds);
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

  const handleSendEmail = async (data: {
    participants: number[];
    subject: string;
    content: string;
  }) => {
    if (!programId) return;

    setIsSendingEmail(true);
    try {
      const res = await reportsService.sendTaskEmail(programId, {
        participants: data.participants,
        subject: data.subject,
        content: data.content,
      });
      if (res.success) {
        showToast("Email sent successfully", "success");
        setIsEmailModalOpen(false);
      } else {
        showToast(res.error || "Failed to send email", "error");
      }
    } catch (error) {
      showToast("An error occurred while sending email", "error");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendWhatsapp = async (data: {
    participant_ids: number[];
    template_name: string;
  }) => {
    if (!programId) return;
    setIsSendingWhatsapp(true);
    try {
      const res = await whatsappMessageService.sendMessage({
        template_name: data.template_name,
        participant_ids: data.participant_ids,
        program_id: Number(programId),
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

  const handleOpenCustomPointsModal = (participantId: string) => {
    if (!participantId) {
      showToast("Participant is missing an identifier", "error");
      return;
    }
    setSelectedParticipantId(participantId);
    setIsCustomPointsModalOpen(true);
  };

  const handleToggleAllParticipants = (checked: boolean) => {
    if (checked) {
      const ids = participants
        .map((participant) => getParticipantNumericId(participant))
        .filter((id): id is number => id !== null);
      setSelectedParticipantIds(Array.from(new Set(ids)));
      return;
    }
    setSelectedParticipantIds([]);
  };

  const handleToggleParticipant = (participantId: number, checked: boolean) => {
    setSelectedParticipantIds((previous) => {
      if (checked) return Array.from(new Set([...previous, participantId]));
      return previous.filter((id) => id !== participantId);
    });
  };

  const handleRewardCustomPoints = async (payload: {
    templateId: string;
    points: number;
  }) => {
    if (!programId || !selectedParticipantId) {
      showToast("Participant or program is missing", "error");
      return;
    }

    setIsRewardingPoints(true);
    try {
      const res = await scoringService.assignCustomPoint(programId, {
        participant_id: Number(selectedParticipantId),
        custom_point_id: Number(payload.templateId),
        point: payload.points,
      });

      if (res.success) {
        showToast("Custom points rewarded successfully", "success");
        setIsCustomPointsModalOpen(false);
        setSelectedParticipantId(null);
        fetchData();
      } else {
        showToast(res.error || "Failed to reward custom points", "error");
      }
    } catch (error) {
      showToast("Failed to reward custom points", "error");
    } finally {
      setIsRewardingPoints(false);
    }
  };

  // No mentor-assignment field exists on Participant yet; both tabs show the
  // same list until the backend adds one.
  const visibleParticipants = participants;

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

          {/* Controls Row */}
          <div className={styles.bulkActionRow}>
            <span className={styles.bulkActionText}>
              You&apos;ve selected{" "}
              <span className={styles.bulkActionCount}>
                {selectedParticipantIds.length}
              </span>{" "}
              Participant{selectedParticipantIds.length === 1 ? "" : "s"}
            </span>
            <div className={styles.bulkActionButtons}>
              <button
                className={styles.whatsappBulkBtn}
                type="button"
                disabled={selectedParticipantIds.length === 0}
                onClick={() => void openBulkWhatsappModal(selectedParticipantIds)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12.031 2C6.546 2 2.041 6.505 2.041 11.99C2.041 13.754 2.501 15.41 3.3 16.857L2 22l5.242-1.378c1.408.767 3.012 1.205 4.717 1.205 5.484 0 9.989-4.505 9.989-9.99C21.948 6.505 17.516 2 12.031 2z"
                    fill="#25D366"
                  />
                  <path
                    d="M17.472 14.382c-.301-.15-1.767-.872-2.04-.971-.272-.1-.47-.15-.667.15-.198.3-.767.971-.94 1.169-.173.199-.347.225-.648.075-.301-.15-1.27-.47-2.42-1.493-.894-.798-1.502-1.782-1.677-2.081-.174-.3-.018-.465.132-.614.135-.133.301-.351.452-.525.151-.175.201-.299.301-.5.1-.199.05-.375-.025-.525-.075-.15-.667-1.608-.915-2.203-.241-.58-.485-.502-.667-.511-.173-.008-.371-.01-.57-.01-.197 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.063 2.875 1.211 3.074.149.198 2.095 3.198 5.074 4.486.708.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.767-.721 2.016-1.416.248-.696.248-1.292.174-1.417-.074-.124-.272-.198-.57-.348z"
                    fill="white"
                  />
                </svg>
                Whatsapp All
              </button>
              <button
                className={styles.emailBulkBtn}
                type="button"
                disabled={selectedParticipantIds.length === 0}
                onClick={() => openBulkEmailModal(selectedParticipantIds)}
              >
                <Image src="/gmail_icon.svg" alt="Email" width={16} height={16} />
                Send Email to All
              </button>
            </div>
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
                  <th style={{ width: "40px" }}>
                    <input
                      type="checkbox"
                      className={styles.checkboxInput}
                      checked={
                        participants.length > 0 &&
                        selectedParticipantIds.length === participants.length
                      }
                      onChange={(event) =>
                        handleToggleAllParticipants(event.target.checked)
                      }
                    />
                  </th>
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
                  <th
                    className={styles.stickyActionTh}
                    style={{
                      width: "100px",
                      textAlign: "right",
                      paddingRight: "20px",
                    }}
                  ></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={16}>
                      <ListSkeletonLoader rows={8} />
                    </td>
                  </tr>
                ) : (
                  visibleParticipants.map((row) => (
                    <tr key={row.slNo}>
                      <td>
                        <input
                          type="checkbox"
                          className={styles.checkboxInput}
                          checked={selectedParticipantIds.includes(
                            Number(row.participantId),
                          )}
                          onChange={(event) => {
                            const participantId = Number(row.participantId);
                            if (!Number.isFinite(participantId) || participantId <= 0) {
                              return;
                            }
                            handleToggleParticipant(
                              participantId,
                              event.target.checked,
                            );
                          }}
                        />
                      </td>
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
                      <td className={styles.stickyActionTd}>
                        <div className={styles.actionCell}>
                          <button
                            type="button"
                            className={styles.whatsappIconBtn}
                            aria-label="Send WhatsApp message"
                            onClick={() => void openWhatsappModal(row)}
                          >
                            <svg
                              width="27"
                              height="27"
                              viewBox="0 0 27 27"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M0.576162 13.3393C0.575529 15.6078 1.1729 17.8229 2.3088 19.7753L0.467529 26.4459L7.34747 24.656C9.25038 25.6838 11.3824 26.2224 13.549 26.2226H13.5547C20.7071 26.2226 26.5293 20.4476 26.5323 13.3495C26.5337 9.90989 25.185 6.67554 22.7345 4.24219C20.2845 1.80905 17.026 0.468367 13.5542 0.466797C6.40099 0.466797 0.579221 6.24145 0.576268 13.3393"
                                fill="url(#whatsappGradientOuter)"
                              />
                              <path
                                d="M0.112852 13.3342C0.112113 15.6844 0.730898 17.9787 1.9073 20.0009L0 26.9107L7.12663 25.0566C9.09025 26.1189 11.3011 26.679 13.5507 26.6799H13.5565C20.9655 26.6799 26.9968 20.6972 27 13.3449C27.0013 9.78174 25.604 6.43113 23.066 3.9106C20.5277 1.3904 17.1527 0.00146512 13.5565 0C6.1463 0 0.115805 5.98186 0.112852 13.3342ZM4.35702 19.6527L4.09092 19.2335C2.97232 17.4687 2.38191 15.4292 2.38275 13.3351C2.38507 7.22397 7.39737 2.25209 13.5608 2.25209C16.5455 2.25335 19.3506 3.40786 21.4604 5.50256C23.5701 7.59747 24.7309 10.3822 24.7302 13.3441C24.7275 19.4552 19.7151 24.4277 13.5565 24.4277H13.5521C11.5468 24.4266 9.58015 23.8923 7.86502 22.8825L7.45685 22.6423L3.22777 23.7425L4.35702 19.6527Z"
                                fill="url(#whatsappGradientInner)"
                              />
                              <path
                                d="M10.1966 7.75943C9.94491 7.20447 9.68008 7.19327 9.44077 7.18354C9.24481 7.17516 9.0208 7.17579 8.79699 7.17579C8.57298 7.17579 8.209 7.25941 7.90135 7.59272C7.59338 7.92635 6.72559 8.73258 6.72559 10.3724C6.72559 12.0121 7.9293 13.597 8.0971 13.8196C8.26511 14.0417 10.4209 17.5145 13.8351 18.8505C16.6727 19.9607 17.2501 19.7399 17.8659 19.6842C18.4819 19.6288 19.8534 18.8782 20.1332 18.0999C20.4132 17.3217 20.4132 16.6547 20.3293 16.5153C20.2453 16.3764 20.0213 16.293 19.6854 16.1264C19.3495 15.9598 17.6979 15.1534 17.3901 15.0421C17.0821 14.931 16.8582 14.8755 16.6342 15.2092C16.4101 15.5424 15.7669 16.293 15.5708 16.5153C15.375 16.7381 15.1789 16.7658 14.8431 16.5991C14.507 16.4319 13.4252 16.0803 12.1417 14.945C11.1431 14.0615 10.469 12.9705 10.273 12.6368C10.0771 12.3036 10.252 12.123 10.4205 11.9569C10.5714 11.8075 10.7565 11.5677 10.9246 11.3731C11.0921 11.1785 11.148 11.0396 11.26 10.8173C11.3721 10.5948 11.316 10.4002 11.2322 10.2335C11.148 10.0668 10.4952 8.41842 10.1966 7.75943Z"
                                fill="white"
                              />
                              <defs>
                                <linearGradient
                                  id="whatsappGradientOuter"
                                  x1="13.5"
                                  y1="26.4459"
                                  x2="13.5"
                                  y2="0.466797"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop stopColor="#1FAF38" />
                                  <stop offset="1" stopColor="#60D669" />
                                </linearGradient>
                                <linearGradient
                                  id="whatsappGradientInner"
                                  x1="13.5"
                                  y1="26.9107"
                                  x2="13.5"
                                  y2="0"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop stopColor="#F9F9F9" />
                                  <stop offset="1" stopColor="white" />
                                </linearGradient>
                              </defs>
                            </svg>
                          </button>
                          <Image
                            className={styles.gmailIcon}
                            src="/gmail_icon.svg"
                            alt="Gmail"
                            width={24}
                            height={24}
                            onClick={() => openEmailModal(row)}
                          />
                          <div
                            className={styles.actionBtn}
                            onClick={(e) =>
                              toggleMenu(e, row.slNo, row.participantId)
                            }
                          >
                            <svg
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M12 8C13.1046 8 14 7.10457 14 6C14 4.89543 13.1046 4 12 4C10.8954 4 10 4.89543 10 6C10 7.10457 10.8954 8 12 8ZM12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14ZM14 18C14 19.1046 13.1046 20 12 20C10.8954 20 10 19.1046 10 18C10 16.8954 10.8954 16 12 16C13.1046 16 14 16.8954 14 18Z"
                                fill="#9CA3AF"
                              />
                            </svg>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!loading &&
            openMenuId &&
            menuPosition &&
            createPortal(
              <div
                className={`${styles.dropdownMenu} ${styles.dropdownMenuFloating}`}
                ref={menuRef}
                style={{
                  top: `${menuPosition.top}px`,
                  left: `${menuPosition.left}px`,
                }}
              >
                <div
                  className={styles.dropdownItem}
                  onClick={() => {
                    setOpenMenuId(null);
                    setMenuPosition(null);
                    if (menuParticipantId) {
                      handleOpenCustomPointsModal(menuParticipantId);
                    }
                  }}
                >
                  Custom Points
                </div>
              </div>,
              document.body,
            )}
        </>
      </div>
      <SendEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        recipients={emailRecipients}
        allowMultipleRecipients={emailRecipients.length > 1}
        isSending={isSendingEmail}
        onSend={handleSendEmail}
      />
      <SendWhatsappModal
        isOpen={isWhatsappModalOpen}
        onClose={() => setIsWhatsappModalOpen(false)}
        recipients={whatsappRecipients}
        allowMultipleRecipients={whatsappRecipients.length > 1}
        templates={whatsappTemplates}
        isLoadingTemplates={isLoadingWhatsappTemplates}
        isSending={isSendingWhatsapp}
        isTrial={isTrial}
        onSend={(data) => void handleSendWhatsapp(data)}
      />
      <RewardCustomPointsModal
        isOpen={isCustomPointsModalOpen}
        onClose={() => {
          setIsCustomPointsModalOpen(false);
          setSelectedParticipantId(null);
        }}
        onReward={handleRewardCustomPoints}
        templates={customPointTemplates}
        isSubmitting={isRewardingPoints}
      />
    </div>
  );
}
