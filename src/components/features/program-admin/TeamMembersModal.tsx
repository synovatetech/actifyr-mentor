'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from '@/styles/teams.module.css';

interface TeamMember {
    participant_id: number;
    participant_ref_id: string | null;
    name: string;
}

interface TeamMembersModalProps {
    isOpen: boolean;
    onClose: () => void;
    teamName: string;
    totalParticipants: number;
    teamSize: number;
    members: TeamMember[];
    onRemove?: (participantId: number, participantName: string) => void;
    loading?: boolean;
}

export default function TeamMembersModal({
    isOpen,
    onClose,
    teamName,
    totalParticipants,
    teamSize,
    members,
    onRemove,
    loading = false,
}: TeamMembersModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className={styles.modalOverlay}>
            <div className={styles.modalContainer} style={{ width: '640px' }}>
                <div className={styles.modalHeader}>{teamName}</div>

                <div className={styles.modalBody}>
                    <div className={styles.badgeRow}>
                        <div className={styles.summaryBadge}>
                            <span className={styles.badgeLabel}>Total</span>
                            <span className={styles.badgeValue}>{totalParticipants}</span>
                        </div>
                        <div className={styles.summaryBadge}>
                            <span className={styles.badgeLabel}>{teamName}</span>
                            <span className={styles.badgeValue}>{teamSize}</span>
                        </div>
                    </div>

                    <div className={styles.assignmentList} style={{ maxHeight: '400px', paddingRight: '12px' }}>
                        {loading && (
                            <div className={styles.pName} style={{ color: '#1E1E1E' }}>Loading members...</div>
                        )}
                        {!loading && members.map((member) => (
                            <div key={member.participant_id} className={styles.assignmentItem}>
                                <div className={styles.pName} style={{ color: '#1E1E1E' }}>
                                    {member.participant_ref_id || member.participant_id} - {member.name}
                                </div>
                                {onRemove && (
                                    <span
                                        className={styles.removeAction}
                                        onClick={() => onRemove(member.participant_id, member.name)}
                                    >
                                        Remove
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className={styles.modalFooter}>
                    <button className={styles.closeBtn} style={{ background: '#71717A' }} onClick={onClose}>Close</button>
                </div>
            </div>
        </div>,
        document.body
    );
}
