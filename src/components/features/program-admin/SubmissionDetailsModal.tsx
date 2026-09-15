'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from '@/styles/submissions.module.css';
import { PageLoader } from '@/components/ui/Loader';

interface FileAttachment {
    id: number;
    fileName: string;
    path: string;
}

export interface SubmissionDetails {
    id: number;
    participant: string;
    subject: string;
    message: string;
    status: string;
    submittedOn: string;
    files: FileAttachment[];
}

interface SubmissionDetailsModalProps {
    isOpen: boolean;
    loading: boolean;
    details: SubmissionDetails | null;
    onClose: () => void;
}

export default function SubmissionDetailsModal({
    isOpen,
    loading,
    details,
    onClose,
}: SubmissionDetailsModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className={styles.modalOverlay}>
            <div className={styles.detailsModalContainer}>
                <div className={styles.detailsModalHeader}>
                    <h3 className={styles.detailsTitle}>Submission Details</h3>
                    <p className={styles.createdAtText}>
                        Submitted on: <strong>{details?.submittedOn || '-'}</strong>
                    </p>
                </div>

                {loading ? (
                    <PageLoader />
                ) : (
                    <>
                        <div className={styles.formGroup}>
                            <label className={styles.detailsLabel}>Participant</label>
                            <div className={styles.readOnlyField}>
                                {details?.participant || '-'}
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.detailsLabel}>Subject</label>
                            <div className={styles.readOnlyField}>
                                {details?.subject || '-'}
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.detailsLabel}>Message</label>
                            <div className={`${styles.readOnlyField} ${styles.readOnlyTextarea}`}>
                                {details?.message || '-'}
                            </div>
                        </div>

                        {details?.files && details.files.length > 0 && (
                            <div className={styles.formGroup}>
                                <label className={styles.detailsLabel}>Attachments</label>
                                <div className={styles.fileList}>
                                    {details.files.map((file) => (
                                        <a
                                            key={file.id}
                                            href={file.path}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.fileItem}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <path
                                                    d="M14 10V12.667A1.334 1.334 0 0 1 12.667 14H3.333A1.334 1.334 0 0 1 2 12.667V10M4.667 6.667 8 10l3.333-3.333M8 10V2"
                                                    stroke="#EE4621"
                                                    strokeWidth="1.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                            <span>{file.fileName}</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className={styles.detailsModalFooter}>
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
