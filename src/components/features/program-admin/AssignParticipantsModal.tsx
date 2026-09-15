"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "@/styles/teams.module.css";

interface TeamMemberCount {
  team_id: number;
  team_name: string;
  team_participant_count: number;
}

interface TeamAssignmentParticipant {
  participant_id: number;
  participant_ref_id: string | null;
  name: string;
  team_id: number | null;
  team_name: string | null;
}

interface AssignParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalParticipants: number;
  assignedParticipants: number;
  unassignedParticipants: number;
  teamStats: TeamMemberCount[];
  participants: TeamAssignmentParticipant[];
  onSave: (
    assignments: { participant_id: number; team_id: number }[],
  ) => void | Promise<void>;
  saving?: boolean;
}

export default function AssignParticipantsModal({
  isOpen,
  onClose,
  totalParticipants,
  assignedParticipants,
  unassignedParticipants,
  teamStats,
  participants,
  onSave,
  saving = false,
}: AssignParticipantsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectionMap, setSelectionMap] = useState<Record<number, string>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const next: Record<number, string> = {};
    participants.forEach((participant) => {
      next[participant.participant_id] = participant.team_id
        ? String(participant.team_id)
        : "";
    });
    setSelectionMap(next);
    setSearchTerm("");
  }, [isOpen, participants]);

  const filteredParticipants = participants.filter((participant) =>
    participant.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleSave = () => {
    const assignments = participants
      .map((participant) => ({
        participant_id: participant.participant_id,
        team_id: Number(selectionMap[participant.participant_id]),
      }))
      .filter(
        (assignment) =>
          Number.isFinite(assignment.team_id) && assignment.team_id > 0,
      );

    onSave(assignments);
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer} style={{ width: "840px" }}>
        <div className={styles.modalHeader}>Assign Participants</div>

        <div className={styles.modalBody}>
          <div className={styles.badgeRow}>
            <div className={styles.summaryBadge}>
              <span className={styles.badgeLabel}>Total</span>
              <span className={styles.badgeValue}>{totalParticipants}</span>
            </div>
            <div className={styles.summaryBadge}>
              <span className={styles.badgeLabel}>Assigned</span>
              <span className={styles.badgeValue}>{assignedParticipants}</span>
            </div>
            <div className={styles.summaryBadge}>
              <span className={styles.badgeLabel}>Unassigned</span>
              <span className={styles.badgeValue}>
                {unassignedParticipants}
              </span>
            </div>
          </div>

          <div
            className={styles.searchBox}
            style={{ width: "100%", marginBottom: "24px" }}
          >
            <input
              className={styles.searchInput}
              placeholder="Search by Participant Name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className={styles.searchBtn} type="button">
              Search
            </button>
          </div>

          <div className={styles.assignLayout}>
            <div className={styles.mainList}>
              {filteredParticipants.map((participant) => (
                <div
                  key={participant.participant_id}
                  className={styles.assignmentItem}
                  style={{ padding: "12px 24px" }}
                >
                  <span className={styles.pName}>
                    {participant.name}
                  </span>
                  <select
                    className={styles.input}
                    style={{ width: "160px", padding: "8px" }}
                    value={selectionMap[participant.participant_id] ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectionMap((prev) => ({
                        ...prev,
                        [participant.participant_id]: value,
                      }));
                    }}
                  >
                    <option value="">Unassigned</option>
                    {teamStats.map((team) => (
                      <option key={team.team_id} value={team.team_id}>
                        {team.team_name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className={styles.sideSummary}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '8px', whiteSpace: 'nowrap' }}>
                No. of participants in each team
              </p>
              {teamStats.map((team) => (
                <div key={team.team_id} className={styles.teamStatRow}>
                  <span>{team.team_name}</span>
                  <b>{team.team_participant_count}</b>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={`${styles.modalFooter} ${styles.assignModalFooter}`}>
          <button
            className={`${styles.closeBtn} ${styles.assignModalActionBtn}`}
            onClick={onClose}
          >
            Close
          </button>
          <button
            className={`${styles.saveBtn} ${styles.assignModalActionBtn}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
