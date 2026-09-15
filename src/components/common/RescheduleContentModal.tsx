'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from '@/styles/reschedule-modal.module.css';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NUMBER: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function formatHolidayDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
        });
    } catch {
        return dateStr;
    }
}

interface RescheduleContentModalProps {
    onClose: () => void;
    onReschedule: (days: number[], holidays: string[]) => void;
    isPending?: boolean;
    initialDays?: number[];
    initialHolidays?: string[];
}

export default function RescheduleContentModal({ onClose, onReschedule, isPending = false, initialDays, initialHolidays }: RescheduleContentModalProps) {
    const [mounted, setMounted] = useState(false);
    const [selectedDays, setSelectedDays] = useState<string[]>(
        initialDays && initialDays.length > 0
            ? initialDays.map(n => DAY_NAMES[n]).filter(Boolean)
            : [...DAY_NAMES]
    );
    const [holidays, setHolidays] = useState<string[]>(initialHolidays ?? []);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

    const toggleDay = (day: string) =>
        setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);

    const addHoliday = (date: string) => {
        if (date && !holidays.includes(date)) setHolidays(prev => [...prev, date]);
    };

    const removeHoliday = (date: string) =>
        setHolidays(prev => prev.filter(d => d !== date));

    const handleRescheduleClick = () => setShowConfirm(true);

    const handleConfirm = () => {
        setShowConfirm(false);
        const days = selectedDays
            .map(d => DAY_NUMBER[d])
            .filter(n => n !== undefined)
            .sort((a, b) => a - b);
        onReschedule(days, holidays);
    };

    if (!mounted) return null;

    return createPortal(
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div className={styles.title}>Reschedule Content</div>
                </div>

                <div className={styles.innerCard}>
                    {isPending && (
                        <div className={styles.loadingOverlay}>
                            <span>Saving content...</span>
                        </div>
                    )}

                    <div className={styles.sectionTitle}>Include or Exclude days from content schedule</div>
                    <div className={styles.sectionDesc}>
                        Select the days of the week to include or exclude for content scheduling
                    </div>
                    <div className={styles.daysRow}>
                        {DAY_NAMES.map(day => {
                            const isSelected = selectedDays.includes(day);
                            return (
                                <button
                                    key={day}
                                    type="button"
                                    className={`${styles.dayChip} ${isSelected ? styles.dayChipSelected : ''}`}
                                    onClick={() => toggleDay(day)}
                                >
                                    {isSelected && (
                                        <span className={styles.dayChipBadge} aria-hidden="true">
                                            <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                                                <path d="M1 4.5L4 7.5L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </span>
                                    )}
                                    {day}
                                </button>
                            );
                        })}
                    </div>

                    <div className={styles.sectionTitle} style={{ marginTop: '28px' }}>Exclude holidays &amp; special days</div>
                    <div className={styles.sectionDesc}>
                        Mark specific dates as holidays or special days to exclude them from content scheduling. Any content scheduled on these dates will automatically move to the next available day.
                    </div>
                    <div className={styles.excludeDateWrapper}>
                        <input
                            type="date"
                            onChange={e => { addHoliday(e.target.value); e.target.value = ''; }}
                            onClick={e => e.currentTarget.showPicker()}
                        />
                        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.excludeDateIcon}>
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

                    {holidays.length > 0 && (
                        <div className={styles.excludedRow}>
                            <span className={styles.excludedLabel}>Excluded:</span>
                            <div className={styles.excludedChips}>
                                {holidays.map(date => (
                                    <span key={date} className={styles.excludedChip}>
                                        {formatHolidayDate(date)}
                                        <button
                                            type="button"
                                            className={styles.excludedChipRemove}
                                            onClick={() => removeHoliday(date)}
                                            aria-label={`Remove ${formatHolidayDate(date)}`}
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    <button className={styles.cancelBtn} onClick={onClose} disabled={isPending}>
                        Close
                    </button>
                    <button
                        className={`${styles.saveBtn} ${isPending ? styles.btnLoading : ''}`}
                        onClick={handleRescheduleClick}
                        disabled={isPending}
                    >
                        {isPending ? 'Saving...' : 'Reschedule'}
                    </button>
                </div>
            </div>

            {showConfirm && (
                <div className={styles.confirmOverlay}>
                    <div className={styles.confirmDialog}>
                        <div className={styles.confirmIconWrap}>
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                                <circle cx="16" cy="16" r="16" fill="#EE4621" />
                                <path d="M16 9v8" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
                                <circle cx="16" cy="22" r="1.3" fill="#ffffff" />
                            </svg>
                        </div>
                        <div className={styles.confirmTitle}>Confirm Reschedule</div>
                        <div className={styles.confirmMessage}>
                            This will reschedule all content based on your selected days and excluded dates. This action cannot be undone.
                        </div>
                        <div className={styles.confirmActions}>
                            <button className={styles.cancelBtn} onClick={() => setShowConfirm(false)}>
                                Cancel
                            </button>
                            <button className={styles.saveBtn} onClick={handleConfirm}>
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
}
