'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from '@/styles/badges-points.module.css';

interface BadgeModalInitialData {
    id?: string | number;
    name?: string;
    targetPct?: number;
    status?: 'Enabled' | 'Disabled';
    is_active?: boolean;
}

interface BadgePercentageBounds {
    min: number;
    max: number; // exclusive
    prevBadgeName?: string;
    nextBadgeName?: string;
}

interface BadgeCreatePayload {
    id: string | number;
    badge: string;
    percentage: number;
    is_active: boolean;
    targetPct: number;
    status: 'Enabled' | 'Disabled';
}

interface BadgeUpdatePayload {
    id: string | number;
    percentage: number;
    is_active: boolean;
    targetPct: number;
    status: 'Enabled' | 'Disabled';
}

interface BadgeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: BadgeCreatePayload | BadgeUpdatePayload) => void;
    initialData?: BadgeModalInitialData;
    isEdit?: boolean;
    percentageBounds?: BadgePercentageBounds | null;
    existingPercentages?: number[];
}

export default function BadgeModal({
    isOpen,
    onClose,
    onSave,
    initialData,
    isEdit = false,
    percentageBounds = null,
    existingPercentages = [],
}: BadgeModalProps) {
    const [name, setName] = useState('');
    const [targetPct, setTargetPct] = useState('');

    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (initialData) {
            setName(initialData.name || '');
            setTargetPct(String(initialData.targetPct || ''));
        } else {
            setName('');
            setTargetPct('');
        }
    }, [initialData, isOpen]);

    const pctValue = Number(targetPct);

    const duplicatePercentage = existingPercentages.includes(Number.isFinite(pctValue) ? pctValue : -1);

    const effectiveBounds: BadgePercentageBounds | null = percentageBounds
        ? percentageBounds
        : existingPercentages.length > 0
          ? (() => {
                // Create mode: compute neighbors around the typed value.
                const sorted = [...existingPercentages].sort((a, b) => a - b);
                const prev = sorted.filter((v) => v < pctValue).pop();
                const next = sorted.find((v) => v > pctValue);
                return {
                    min: typeof prev === 'number' ? prev : 0,
                    max: typeof next === 'number' ? next : 101, // exclusive
                    prevBadgeName: undefined,
                    nextBadgeName: undefined,
                };
            })()
          : null;

    const targetPctError = (() => {
        if (!targetPct.trim()) return '';
        if (!Number.isFinite(pctValue)) return 'Please enter a valid percentage.';

        // Basic sanity for both create/edit.
        if (pctValue <= 0 || pctValue >= 101) return 'Percentage must be between 1 and 100.';

        if (duplicatePercentage && (!isEdit || initialData?.targetPct !== pctValue)) {
            return 'This percentage is already used by another badge.';
        }

        if (effectiveBounds) {
            if (pctValue <= effectiveBounds.min) {
                const prevName =
                    effectiveBounds.prevBadgeName || `the previous badge (${effectiveBounds.min}%)`;
                return `Percentage must be greater than ${prevName}.`;
            }
            if (pctValue >= effectiveBounds.max) {
                const nextName =
                    effectiveBounds.nextBadgeName || `the next badge (${effectiveBounds.max}%)`;
                return `Percentage must be less than ${nextName}.`;
            }
        }

        return '';
    })();

    const canSave =
        targetPct.trim().length > 0 &&
        Number.isFinite(pctValue) &&
        !targetPctError &&
        (!isEdit ? name.trim().length > 0 : true);

    if (!isOpen || !mounted) return null;

    const handleSave = () => {
        if (!canSave) return;

        const pct = parseInt(targetPct, 10);
        const isActive =
            initialData?.status === 'Enabled' || Boolean(initialData?.is_active);

        // Note: On edit, we intentionally omit `badge` / title fields from payload.
        const basePayload: BadgeUpdatePayload = {
            id: initialData?.id || Date.now().toString(),
            percentage: pct,
            is_active: isActive,
            targetPct: pct,
            status: initialData?.status || 'Enabled',
        };

        if (!isEdit) {
            const createPayload: BadgeCreatePayload = {
                ...basePayload,
                badge: name.trim(),
            };
            onSave(createPayload);
            return;
        }

        onSave(basePayload);
    };

    return createPortal(
        <div className={styles.modalOverlay}>
            <div className={styles.modalContainer} style={{ width: '480px' }}>
                <div className={styles.modalHeader}>
                    {isEdit ? 'Edit Badge' : 'Create Badge'}
                </div>

                <div className={styles.modalBody}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Badge Title</label>
                        <input
                            className={styles.input}
                            placeholder="Enter the Badge Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            readOnly={isEdit}
                            aria-readonly={isEdit ? 'true' : undefined}
                            style={isEdit ? { opacity: 0.75, cursor: 'not-allowed' } : undefined}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Set Target Percentage <span>(% of Total Achievable Points)</span></label>
                        <input
                            className={styles.input}
                            placeholder="Enter Percentage (%)"
                            value={targetPct}
                            onChange={(e) => setTargetPct(e.target.value)}
                            type="number"
                        />
                        {targetPctError ? (
                            <div className={styles.validationErrorText}>{targetPctError}</div>
                        ) : null}
                    </div>
                </div>

                <div className={styles.modalFooter}>
                    <button className={styles.closeBtn} onClick={onClose} type="button">
                        Close
                    </button>
                    <button
                        className={styles.saveBtn}
                        type="button"
                        onClick={handleSave}
                        disabled={!canSave}
                    >
                        {isEdit ? 'Update' : 'Save Badge'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
