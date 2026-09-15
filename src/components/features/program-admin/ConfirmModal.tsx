'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from '@/styles/teams.module.css';

interface ConfirmRemovalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    studentName: string;
    teamName: string;
}

export default function ConfirmRemovalModal({ isOpen, onClose, onConfirm, studentName, teamName }: ConfirmRemovalModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className={styles.modalOverlay}>
            <div className={styles.modalContainer} style={{ width: '480px' }}>
                <div className={styles.confirmBody}>
                    <div className={styles.confirmTitle}>Confirm Removal</div>

                    <p className={styles.confirmText}>
                        Are you sure you want to remove <strong>{studentName}</strong> from <strong>{teamName}</strong>?
                    </p>

                    <div className={styles.modalFooter} style={{ border: 'none', padding: 0 }}>
                        <button className={styles.closeBtn} onClick={onClose}>No, close</button>
                        <button className={styles.saveBtn} onClick={() => { onConfirm(); onClose(); }}>Yes, remove</button>
                    </div>

                    <span className={styles.noteText}>
                        Note: Once removed, the participant will be moved to the Unassigned list and can be added to any team, including {teamName}
                    </span>
                </div>
            </div>
        </div>,
        document.body
    );
}
