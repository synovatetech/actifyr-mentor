'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from '@/styles/goals-habits.module.css';

interface AddGoalHabitModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { title: string; description: string }) => void;
    type: 'Goal' | 'Habit';
    initialData?: { title: string; description: string };
}

export default function AddGoalHabitModal({
    isOpen,
    onClose,
    onSave,
    type,
    initialData
}: AddGoalHabitModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setTitle(initialData?.title || '');
            setDescription(initialData?.description || '');
        }
    }, [isOpen, initialData]);

    if (!isOpen || !mounted) return null;

    const handleSave = () => {
        if (!title.trim()) return;
        onSave({ title, description });
    };

    return createPortal(
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>{initialData ? 'Edit' : 'Add'} {type}</h2>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>
                <div className={styles.modalBody}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>{type} Title</label>
                        <input
                            className={styles.input}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={`Enter ${type.toLowerCase()} title`}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Description</label>
                        <textarea
                            className={styles.textarea}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={`Enter ${type.toLowerCase()} description`}
                            rows={4}
                        />
                    </div>
                </div>
                <div className={styles.modalFooter}>
                    <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
                    <button
                        className={styles.saveBtn}
                        onClick={handleSave}
                        disabled={!title.trim()}
                    >
                        Save {type}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
