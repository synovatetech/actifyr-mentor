"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "@/styles/reports.module.css";

interface ModifyHeadersModalProps {
  isOpen: boolean;
  initialSelectedHeaders: string[];
  onClose: () => void;
  onGenerate: (selectedHeaders: string[]) => void;
}

const ALL_HEADERS = [
  "Participant Name",
  "Date of Joining",
  "Team Name",
  "Max Points",
  "Points Earned",
  "Rank",
  "Badge",
  "Learning Engagement",
  "Learning Effectiveness",
  "Total Tasks",
  "Tasks Completed",
  "Tasks Pending",
  "Number of Goals",
  "Total Goals Completed (%)",
  "Number of Habits",
  "Total Habits Completed (%)",
];

export default function ModifyHeadersModal({
  isOpen,
  initialSelectedHeaders,
  onClose,
  onGenerate,
}: ModifyHeadersModalProps) {
  const [selected, setSelected] = useState<string[]>(initialSelectedHeaders);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setSelected([...initialSelectedHeaders]);
  }, [isOpen, initialSelectedHeaders]);

  if (!isOpen || !mounted) return null;

  const toggleHeader = (header: string) => {
    setSelected((prev) =>
      prev.includes(header) ? prev.filter((h) => h !== header) : [...prev, header],
    );
  };

  const modalTitleId = "modify-headers-modal-title";

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
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.modalHeader}>
          <h2 id={modalTitleId} className={styles.modalTitle}>
            Select report headers
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

        <div className={styles.selectionGrid}>
          {ALL_HEADERS.map((header) => {
            const isChecked = selected.includes(header);
            return (
              <div
                key={header}
                className={styles.checkboxItem}
                onClick={() => toggleHeader(header)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleHeader(header);
                  }
                }}
                role="checkbox"
                aria-checked={isChecked}
                tabIndex={0}
              >
                <div
                  className={`${styles.checkbox} ${styles.checkboxFixed} ${isChecked ? styles.checked : ""}`}
                >
                  {isChecked && (
                    <svg width="12" height="10" viewBox="0 0 12 10" fill="none" aria-hidden>
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
                <span>{header}</span>
              </div>
            );
          })}
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.unselectBtn}
            onClick={() => setSelected([])}
          >
            Unselect All
          </button>
          <button
            type="button"
            className={styles.generateBtn}
            onClick={() => onGenerate(selected)}
          >
            Generate Report
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
