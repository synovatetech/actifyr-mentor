'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from '@/styles/goals-habits.module.css';
import { PageLoader } from '@/components/ui/Loader';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

type DayStatus = 'completed' | 'missed' | 'pending' | 'disabled';

interface WeekData {
    week_number: number;
    date_range: { start: string; end: string };
    days: Record<string, DayStatus>;
}

export interface HabitProgress {
    startDate: string;
    endDate: string;
    weeks: WeekData[];
}

interface HabitProgressModalProps {
    isOpen: boolean;
    loading: boolean;
    progress: HabitProgress | null;
    onClose: () => void;
}

function formatShortDate(dateStr: string): string {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function StatusIcon({ status }: { status: DayStatus }) {
    if (status === 'completed') {
        return (
            <div className={`${styles.progressCell} ${styles.progressCompleted}`}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8L6.5 11.5L13 5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
        );
    }
    if (status === 'missed') {
        return (
            <div className={`${styles.progressCell} ${styles.progressMissed}`}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 3L11 11M11 3L3 11" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
        );
    }
    return <div className={`${styles.progressCell} ${styles.progressEmpty}`} />;
}

export default function HabitProgressModal({
    isOpen,
    loading,
    progress,
    onClose,
}: HabitProgressModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className={styles.modalOverlay}>
            <div className={styles.detailsModalContainer}>
                <h3 className={styles.detailsTitle} style={{ marginBottom: 24 }}>
                    Habit Progress Tracker
                </h3>

                {loading ? (
                    <PageLoader />
                ) : (
                    <>
                        <div className={styles.progressTableWrapper}>
                            <table className={styles.progressTable}>
                                <thead>
                                    <tr>
                                        <th />
                                        {DAY_HEADERS.map((day) => (
                                            <th key={day}>{day}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {(progress?.weeks ?? []).map((week) => {
                                        const rangeLabel = `${formatShortDate(week.date_range.start)} - ${formatShortDate(week.date_range.end)}`;
                                        return (
                                            <tr key={week.week_number}>
                                                <td className={styles.weekLabel}>
                                                    <strong>Week {week.week_number}</strong>{' '}
                                                    <span>({rangeLabel})</span>
                                                </td>
                                                {DAY_KEYS.map((dayKey) => (
                                                    <td key={dayKey} className={styles.progressCellTd}>
                                                        <StatusIcon status={week.days[dayKey] ?? 'disabled'} />
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className={styles.detailsModalFooter} style={{ justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                className={styles.closeDetailsBtn}
                                onClick={onClose}
                            >
                                Close
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body,
    );
}
