'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from '@/styles/goals-habits.module.css';
import { PageLoader } from '@/components/ui/Loader';

export interface GoalDetails {
    id: number;
    title: string;
    description: string;
    targetDate: string;
    remark: string;
    progress: number;
    createdAt: string;
}

interface GoalDetailsModalProps {
    isOpen: boolean;
    loading: boolean;
    details: GoalDetails | null;
    type: 'Goals' | 'Habits';
    onClose: () => void;
}

export default function GoalDetailsModal({
    isOpen,
    loading,
    details,
    type,
    onClose,
}: GoalDetailsModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    const titleLabel = type === 'Goals' ? 'Goal Title' : 'Habit Title';

    return createPortal(
        <div className={styles.modalOverlay}>
            <div className={styles.detailsModalContainer}>
                <div className={styles.detailsModalHeader}>
                    <h3 className={styles.detailsTitle}>{type}</h3>
                    <p className={styles.createdAtText}>
                        Created on: <strong>{details?.createdAt || '-'}</strong>
                    </p>
                </div>

                {loading ? (
                    <PageLoader />
                ) : (
                    <>
                        <div className={styles.formGroup}>
                            <label className={styles.detailsLabel}>{titleLabel}</label>
                            <div className={styles.readOnlyField}>{details?.title || '-'}</div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.detailsLabel}>Description</label>
                            <div className={`${styles.readOnlyField} ${styles.readOnlyTextarea}`}>
                                {details?.description || '-'}
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.detailsLabel}>Target Date</label>
                            <div className={styles.readOnlyField}>{details?.targetDate || '-'}</div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.detailsLabel}>Remarks</label>
                            <div className={`${styles.readOnlyField} ${styles.readOnlyTextarea}`}>
                                {details?.remark || '-'}
                            </div>
                        </div>

                        <div className={styles.detailsModalFooter}>
                            <p className={styles.currentProgressText}>
                                Current Progress: <span>{details?.progress ?? 0}%</span>
                            </p>
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
