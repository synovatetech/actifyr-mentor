'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import styles from '@/styles/confirm-modal.module.css';

interface ConfirmCloseModalProps {
    title?: string;
    message?: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
    /** Disables just the confirm button (independent of isLoading) — e.g. until a required field elsewhere in `message` is filled in. */
    confirmDisabled?: boolean;
    /** Shows a trash icon on the confirm button — only for actions that actually delete something. */
    showDeleteIcon?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    /** Optional third action rendered after Cancel, before the (now secondary-styled) confirm button — e.g. "Save Changes" as the recommended way out of an unsaved-changes prompt. */
    extraActionText?: string;
    onExtraAction?: () => void;
    extraActionLoading?: boolean;
}

export default function ConfirmCloseModal({
    title = 'Unsaved Changes',
    message = 'You have unsaved changes. Are you sure you want to close and discard them?',
    confirmText = 'Discard Changes',
    cancelText = 'Cancel',
    isLoading = false,
    confirmDisabled = false,
    showDeleteIcon = false,
    onConfirm,
    onCancel,
    extraActionText,
    onExtraAction,
    extraActionLoading = false,
}: ConfirmCloseModalProps) {
    if (typeof window === 'undefined') return null;

    const hasExtraAction = !!(extraActionText && onExtraAction);
    const isBusy = isLoading || extraActionLoading;

    return createPortal(
        <div className={styles.overlay}>
            <div
                className={`${styles.container} ${hasExtraAction ? styles.containerWide : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles.headerRow}>
                    <div className={styles.headerContent}>
                        <div className={styles.iconCircle}>
                            <svg
                                width="22"
                                height="22"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                        </div>
                        <div className={styles.title}>{title}</div>
                    </div>
                    <button
                        type="button"
                        className={styles.closeIcon}
                        onClick={onCancel}
                        disabled={isBusy}
                        aria-label="Close"
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <div className={styles.messageRow}>
                    <div className={styles.message}>{message}</div>
                </div>

                <div className={styles.footer}>
                    <button className={styles.cancelBtn} onClick={onCancel} type="button" disabled={isBusy}>
                        {cancelText}
                    </button>
                    <button
                        className={hasExtraAction ? styles.cancelBtn : styles.confirmBtn}
                        onClick={onConfirm}
                        type="button"
                        disabled={isBusy || (!hasExtraAction && confirmDisabled)}
                    >
                        {isLoading ? (
                            <>
                                <span className={styles.spinner}></span> Processing...
                            </>
                        ) : (
                            <>
                                {showDeleteIcon && (
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m5 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" />
                                    </svg>
                                )}
                                {confirmText}
                            </>
                        )}
                    </button>
                    {hasExtraAction && (
                        <button
                            className={styles.confirmBtn}
                            onClick={onExtraAction}
                            type="button"
                            disabled={isBusy}
                        >
                            {extraActionLoading ? (
                                <>
                                    <span className={styles.spinner}></span> Saving...
                                </>
                            ) : (
                                extraActionText
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
