"use client";

import { useState } from "react";
import baseStyles from "@/styles/create-program.module.css";
import styles from "@/styles/duplicate-program.module.css";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface ContentScheduleProps {
  selectedDays: string[];
  excludedDates: string[];
  onDayToggle: (day: string) => void;
  onAddExcludedDate: (date: string) => void;
  onRemoveExcludedDate: (date: string) => void;
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function ContentScheduleSection({
  selectedDays,
  excludedDates,
  onDayToggle,
  onAddExcludedDate,
  onRemoveExcludedDate,
}: ContentScheduleProps) {
  const [dateInput, setDateInput] = useState("");

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val && !excludedDates.includes(val)) {
      onAddExcludedDate(val);
    }
    // reset after adding
    e.target.value = "";
    setDateInput("");
  };

  return (
    <section className={baseStyles.section}>
      <h2 className={baseStyles.sectionTitle}>Content Schedule</h2>

      {/* Days of week selector */}
      <div className={baseStyles.formGroup}>
        <label className={baseStyles.label}>
          Include or Exclude days from content schedule
        </label>
        <p className={baseStyles.hint}>
          Select the days of the week to include or exclude for content scheduling
        </p>

        <div className={styles.daysRow}>
          {DAYS_OF_WEEK.map((day) => {
            const isSelected = selectedDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                className={`${styles.dayChip} ${isSelected ? styles.dayChipSelected : ""}`}
                onClick={() => onDayToggle(day)}
              >
                {/* Badge floats on the top-centre border */}
                {isSelected && (
                  <span className={styles.dayChipBadge} aria-hidden="true">
                    <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                      <path
                        d="M1 4.5L4 7.5L10 1"
                        stroke="white"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                )}
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Exclude holidays & special days */}
      <div className={baseStyles.formGroup} style={{ marginTop: 20 }}>
        <label className={baseStyles.label}>
          Exclude holidays &amp; special days
        </label>
        <p className={baseStyles.hint}>
          Mark specific dates as holidays or special days to exclude them from content
          scheduling. Any content scheduled on these dates will automatically move to the
          next available day.
        </p>

        {/* Uses the same wrapper pattern as create-program date inputs */}
        <div className={styles.excludeDateWrapper}>
          <input
            type="date"
            value={dateInput}
            onChange={handleDateChange}
            className={baseStyles.input}
            placeholder="Click to add date"
            onClick={(e) => e.currentTarget.showPicker()}
          />
          {/* Custom calendar icon — native picker indicator is hidden via CSS */}
          <svg
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={styles.excludeDateIcon}
          >
            <rect x="5" y="8" width="30" height="27" rx="3" stroke="#EE4621" strokeWidth="2" />
            <path d="M5 15H35" stroke="#EE4621" strokeWidth="2" />
            <rect x="12" y="5" width="2" height="6" rx="1" fill="#F49079" />
            <rect x="26" y="5" width="2" height="6" rx="1" fill="#F49079" />
            <rect x="10" y="20" width="4" height="4" rx="1" fill="#EE4621" />
            <rect x="18" y="20" width="4" height="4" rx="1" fill="#EE4621" />
            <rect x="26" y="20" width="4" height="4" rx="1" fill="#EE4621" />
            <rect x="10" y="28" width="4" height="4" rx="1" fill="#EE4621" />
            <rect x="18" y="28" width="4" height="4" rx="1" fill="#EE4621" />
          </svg>
        </div>

        {excludedDates.length > 0 && (
          <div className={styles.excludedDatesRow}>
            <span className={styles.excludedLabel}>Excluded:</span>
            <div className={styles.excludedChips}>
              {excludedDates.map((date) => (
                <span key={date} className={styles.excludedChip}>
                  {formatDateDisplay(date)}
                  <button
                    type="button"
                    className={styles.excludedChipRemove}
                    onClick={() => onRemoveExcludedDate(date)}
                    aria-label={`Remove ${formatDateDisplay(date)}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
