'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from '@/styles/badges-points.module.css';

interface PointsConfigProps {
    points: any[];
    onUpdate: (id: string | number, updates: Record<string, unknown>) => Promise<any>;
    isLoading?: boolean;
}

type EditState = {
    id: string;
    points_24h: string;
    points_48h: string;
    points_after_48h: string;
    base_points: string;
    is_active: boolean;
};

const pt = (val: number | null | undefined) => (val == null ? '-' : val);

const formatFrequency = (item: any): string => {
    const cat = (item.category ?? '').toUpperCase();
    if (cat === 'ONE_TIME') return 'Once';
    if (cat === 'LIMITED') {
        return item.max_attempts != null ? `Max ${item.max_attempts} times` : 'Limited';
    }
    if (cat === 'RECURRING') return 'Daily or when completed';
    if (!item.category) return '-';
    const s = item.category.replace(/_/g, ' ').toLowerCase();
    return s.charAt(0).toUpperCase() + s.slice(1);
};

export default function PointsConfig({ points, onUpdate, isLoading }: PointsConfigProps) {
    const [editState, setEditState] = useState<EditState | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const tableRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (editState && !isSaving && tableRef.current && !tableRef.current.contains(e.target as Node)) {
                setEditState(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [editState, isSaving]);

    const handleEdit = (item: any) => {
        setEditState({
            id: String(item.id),
            points_24h: item.points_24h != null ? String(item.points_24h) : '',
            points_48h: item.points_48h != null ? String(item.points_48h) : '',
            points_after_48h: item.points_after_48h != null ? String(item.points_after_48h) : '',
            base_points: item.base_points != null ? String(item.base_points) : '',
            is_active: Boolean(item.is_active),
        });
    };

    const handleSave = async (item: any) => {
        if (!editState) return;
        const isRecurring = (item.category ?? '').toUpperCase() === 'RECURRING';
        const isDailyChat = item.activity_code === 'DAILY_CHAT_CONTRIBUTION';

        const updates: Record<string, unknown> = { is_active: editState.is_active };

        if (isDailyChat) {
            updates.base_points = editState.base_points === '' ? null : Number(editState.base_points);
        } else if (isRecurring) {
            updates.points_24h = editState.points_24h === '' ? null : Number(editState.points_24h);
            updates.points_48h = editState.points_48h === '' ? null : Number(editState.points_48h);
            updates.points_after_48h = editState.points_after_48h === '' ? null : Number(editState.points_after_48h);
        } else {
            updates.base_points = editState.base_points === '' ? null : Number(editState.base_points);
        }

        setIsSaving(true);
        try {
            await onUpdate(item.id, updates);
            setEditState(null);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className={styles.tableCard} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                Loading...
            </div>
        );
    }

    return (
        <div className={styles.tableCard} ref={tableRef}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th style={{ width: '48px' }}>#</th>
                        <th>Activity</th>
                        <th>Frequency</th>
                        <th style={{ textAlign: 'center' }}>Base Points</th>
                        <th style={{ textAlign: 'center' }}>24h</th>
                        <th style={{ textAlign: 'center' }}>48h</th>
                        <th style={{ textAlign: 'center' }}>After 48h</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {points.length === 0 ? (
                        <tr>
                            <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                                No point configurations found.
                            </td>
                        </tr>
                    ) : (
                        points.map((item, idx) => {
                            const isEditing = editState?.id === String(item.id);
                            const isRecurring = (item.category ?? '').toUpperCase() === 'RECURRING';
                            const isDailyChat = item.activity_code === 'DAILY_CHAT_CONTRIBUTION';
                            const recurringEditable = isRecurring && !isDailyChat;
                            const basePointsEditable = !isRecurring || isDailyChat;

                            return (
                                <tr key={item.id}>
                                    <td style={{ color: 'var(--color-text-secondary)' }}>
                                        {String(idx + 1).padStart(2, '0')}
                                    </td>
                                    <td style={{ fontWeight: 500 }}>
                                        {item.activity_name || item.activity || item.title || 'Other'}
                                    </td>
                                    <td>
                                        <span className={styles.categoryBadge}>{formatFrequency(item)}</span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        {isEditing && basePointsEditable ? (
                                            <input
                                                type="number"
                                                value={editState.base_points}
                                                onChange={(e) => setEditState({ ...editState, base_points: e.target.value })}
                                                className={styles.pointsInput}
                                            />
                                        ) : (
                                            <span style={{ color: 'var(--color-text-secondary)' }}>{pt(item.base_points)}</span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        {isEditing && recurringEditable ? (
                                            <input
                                                type="number"
                                                value={editState.points_24h}
                                                onChange={(e) => setEditState({ ...editState, points_24h: e.target.value })}
                                                className={styles.pointsInput}
                                            />
                                        ) : (
                                            <span style={{ color: 'var(--color-text-secondary)' }}>{pt(item.points_24h)}</span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        {isEditing && recurringEditable ? (
                                            <input
                                                type="number"
                                                value={editState.points_48h}
                                                onChange={(e) => setEditState({ ...editState, points_48h: e.target.value })}
                                                className={styles.pointsInput}
                                            />
                                        ) : (
                                            <span style={{ color: 'var(--color-text-secondary)' }}>{pt(item.points_48h)}</span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        {isEditing && recurringEditable ? (
                                            <input
                                                type="number"
                                                value={editState.points_after_48h}
                                                onChange={(e) => setEditState({ ...editState, points_after_48h: e.target.value })}
                                                className={styles.pointsInput}
                                            />
                                        ) : (
                                            <span style={{ color: 'var(--color-text-secondary)' }}>{pt(item.points_after_48h)}</span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        {isEditing ? (
                                            <select
                                                value={editState.is_active ? 'true' : 'false'}
                                                onChange={(e) => setEditState({ ...editState, is_active: e.target.value === 'true' })}
                                                className={styles.statusSelect}
                                            >
                                                <option value="true">Active</option>
                                                <option value="false">Inactive</option>
                                            </select>
                                        ) : (
                                            <span className={item.is_active ? styles.statusActive : styles.statusInactive}>
                                                {item.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        )}
                                    </td>
                                    <td className={styles.actionCell}>
                                        {isEditing ? (
                                            <span
                                                className={`${styles.saveLink} ${isSaving ? styles.disabledLink : ''}`}
                                                onClick={() => !isSaving && handleSave(item)}
                                            >
                                                {isSaving ? 'Saving…' : 'Save'}
                                            </span>
                                        ) : (
                                            <span className={styles.editLink} onClick={() => handleEdit(item)}>
                                                Edit
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
}
