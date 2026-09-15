"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "@/styles/reports.module.css";
import type {
  ContentOption,
  ParticipantOption,
  TaskFilters,
} from "@/components/features/program-admin/reports/reportTabs.types";
import { TaskFilterRow } from "@/app/programAdmin/reports/ReportsContent";

export type CriteriaModalVariant = "assessment" | "task";

interface ModifyCriteriaModalProps {
  isOpen: boolean;
  variant: CriteriaModalVariant;
  participantOptions: ParticipantOption[];
  assessmentFilters: {
    participantId: string;
    startDate: string;
    endDate: string;
  };
  onAssessmentFiltersChange: React.Dispatch<
    React.SetStateAction<{
      participantId: string;
      startDate: string;
      endDate: string;
    }>
  >;
  taskFilters: TaskFilters;
  onTaskFiltersChange: React.Dispatch<React.SetStateAction<TaskFilters>>;
  contentOptions: ContentOption[];
  taskParticipantOptions: ParticipantOption[];
  programStartDate?: string;
  programEndDate?: string;
  onClose: () => void;
  onGenerate: () => void;
}

const VARIANT_TITLES: Record<CriteriaModalVariant, string> = {
  assessment: "Assessment report criteria",
  task: "Task report criteria",
};

export default function ModifyCriteriaModal({
  isOpen,
  variant,
  participantOptions,
  assessmentFilters,
  onAssessmentFiltersChange,
  taskFilters,
  onTaskFiltersChange,
  contentOptions,
  taskParticipantOptions,
  programStartDate,
  programEndDate,
  onClose,
  onGenerate,
}: ModifyCriteriaModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const modalTitleId = "modify-criteria-modal-title";
  const title = VARIANT_TITLES[variant];

  return createPortal(
    <div
      className={styles.modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalTitleId}
      onClick={onClose}
    >
      <div
        className={styles.modalContainer}
        style={{ width: "min(820px, calc(100vw - 32px))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.modalHeader}>
          <h2 id={modalTitleId} className={styles.modalTitle}>
            {title}
          </h2>
          <button
            type="button"
            className={styles.modalCloseBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        {variant === "assessment" && (
          <div className={styles.criteriaGrid}>
            <div className={styles.criteriaItem}>
              <label className={styles.inputLabel} htmlFor="criteria-assessment-participant">
                Participants
              </label>
              <div className={styles.selectWrapper}>
                <select
                  id="criteria-assessment-participant"
                  className={styles.select}
                  value={assessmentFilters.participantId}
                  onChange={(event) =>
                    onAssessmentFiltersChange((previous) => ({
                      ...previous,
                      participantId: event.target.value,
                    }))
                  }
                >
                  <option value="all">All Participants</option>
                  {participantOptions.map((participant) => (
                    <option key={participant.id} value={String(participant.id)}>
                      {participant.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.criteriaItem}>
              <label className={styles.inputLabel} htmlFor="criteria-assessment-start">
                Start Date
              </label>
              <div
                className={styles.dateWrapper}
                onClick={(e) => {
                  (e.currentTarget.querySelector('input[type="date"]') as HTMLInputElement | null)?.showPicker?.();
                }}
              >
                <input
                  id="criteria-assessment-start"
                  type="date"
                  className={styles.dateInput}
                  value={assessmentFilters.startDate}
                  min={programStartDate}
                  max={programEndDate}
                  onChange={(event) =>
                    onAssessmentFiltersChange((previous) => ({
                      ...previous,
                      startDate: event.target.value,
                    }))
                  }
                />
                <span className={styles.calendarIcon} aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                </span>
              </div>
            </div>
            <div className={styles.criteriaItem}>
              <label className={styles.inputLabel} htmlFor="criteria-assessment-end">
                End Date
              </label>
              <div
                className={styles.dateWrapper}
                onClick={(e) => {
                  (e.currentTarget.querySelector('input[type="date"]') as HTMLInputElement | null)?.showPicker?.();
                }}
              >
                <input
                  id="criteria-assessment-end"
                  type="date"
                  className={styles.dateInput}
                  value={assessmentFilters.endDate}
                  min={programStartDate}
                  max={programEndDate}
                  onChange={(event) =>
                    onAssessmentFiltersChange((previous) => ({
                      ...previous,
                      endDate: event.target.value,
                    }))
                  }
                />
                <span className={styles.calendarIcon} aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                </span>
              </div>
            </div>
            <button
              type="button"
              className={styles.generateBtn}
              style={{ padding: "12px 32px" }}
              onClick={onGenerate}
            >
              Generate Report
            </button>
          </div>
        )}

        {variant === "task" && (
          <>
            <TaskFilterRow
              taskFilters={taskFilters}
              onFiltersChange={onTaskFiltersChange}
              contentOptions={contentOptions}
              participantOptions={taskParticipantOptions}
            />
            <div className={styles.modalFooter} style={{ marginTop: 24 }}>
              <button
                type="button"
                className={styles.generateBtn}
                style={{ padding: "12px 32px" }}
                onClick={onGenerate}
                disabled={taskFilters.contentIds.length === 0 || taskFilters.participantIds.length === 0}
              >
                Generate Report
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
