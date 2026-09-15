'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from '@/styles/teams.module.css';

interface AddTeamModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { name: string; description: string }) => void;
}

export default function AddTeamModal({ isOpen, onClose, onSave }: AddTeamModalProps) {
    const [name, setName] = useState('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    const handleSave = () => {
        if (name.trim().length >= 3) {
            onSave({ name, description: '' });
            setName('');
        }
    };

    return createPortal(
        <div className={styles.modalOverlay}>
            <div className={styles.modalContainer}>
                <div className={styles.modalHeader}>Add Team</div>

                <div className={styles.modalBody}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Create New Team</label>
                        <input
                            className={styles.input}
                            placeholder="Enter the Team Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <ul className={styles.infoList}>
                            <li className={styles.infoItem}>Team name must be of minimum 3 characters</li>
                            <li className={styles.infoItem}>Team name must be unique within a program</li>
                            <li className={styles.infoItem}>Team name can have space( ), but no special characters</li>
                        </ul>
                    </div>
                </div>

                <div className={styles.modalFooter}>
                    <button className={styles.closeBtn} onClick={onClose}>Close</button>
                    <button className={styles.saveBtn} onClick={handleSave}>Save Team</button>
                </div>
            </div>
        </div>,
        document.body
    );
}
