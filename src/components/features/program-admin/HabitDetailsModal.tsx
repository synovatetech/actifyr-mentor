'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from '@/styles/goals-habits.module.css';
import { PageLoader } from '@/components/ui/Loader';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export interface HabitDetails {
    id: number;
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    frequency: number[];
    createdAt: string;
}

interface HabitDetailsModalProps {
    isOpen: boolean;
    loading: boolean;
    details: HabitDetails | null;
    onClose: () => void;
}

export default function HabitDetailsModal({
    isOpen,
    loading,
    details,
    onClose,
}: HabitDetailsModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    const frequencySet = new Set(details?.frequency ?? []);

    return createPortal(
        <div className={styles.modalOverlay}>
            <div className={styles.detailsModalContainer}>
                <div className={styles.detailsModalHeader}>
                    <h3 className={styles.detailsTitle}>Habit</h3>
                    <p className={styles.createdAtText}>
                        Created on: <strong>{details?.createdAt || '-'}</strong>
                    </p>
                </div>

                {loading ? (
                    <PageLoader />
                ) : (
                    <>
                        <div className={styles.formGroup}>
                            <label className={styles.detailsLabel}>Habit Name</label>
                            <div className={styles.readOnlyField}>{details?.title || '-'}</div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.detailsLabel}>Description</label>
                            <div className={`${styles.readOnlyField} ${styles.readOnlyTextarea}`}>
                                {details?.description || '-'}
                            </div>
                        </div>

                        <div className={styles.dateRow}>
                            <div className={styles.formGroup}>
                                <label className={styles.detailsLabel}>Start from</label>
                                <div className={styles.readOnlyField}>
                                    {details?.startDate || '-'}
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.detailsLabel}>Until</label>
                                <div className={styles.readOnlyField}>
                                    {details?.endDate || '-'}
                                </div>
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.detailsLabel}>Frequency</label>
                            <div className={styles.frequencyRow}>
                                {DAY_LABELS.map((label, index) => {
                                    const isActive = frequencySet.has(index);
                                    return (
                                        <div key={label} className={styles.frequencyDay}>
                                            <span className={styles.frequencyDayLabel}>{label}</span>
                                            <div
                                                className={`${styles.frequencyCheckbox} ${isActive ? styles.frequencyChecked : ''}`}
                                            >
                                                {isActive && (
                                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                                        <path
                                                            d="M2.5 7L5.5 10L11.5 4"
                                                            stroke="#fff"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    </svg>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
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
