'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from '@/styles/badges-points.module.css';

interface Badge {
    id: string;
    name: string;
    targetPct: number;
    individualReward?: { title: string; image?: string };
    teamReward?: { title: string; image?: string };
    status: 'Enabled' | 'Disabled';
}

interface BadgesTableProps {
    badges: Badge[];
    onEdit: (badge: Badge) => void;
    onDelete: (id: string, status: string) => void;
    onAddReward: (badgeId: string, type: 'individual' | 'team') => void;
    onEditReward: (
        badgeId: string,
        type: 'individual' | 'team',
        reward: { title: string; image?: string },
    ) => void;
}

export default function BadgesTable({
    badges,
    onEdit,
    onDelete,
    onAddReward,
    onEditReward,
}: BadgesTableProps) {
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleMenu = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setOpenMenuId(openMenuId === id ? null : id);
    };

    return (
        <div className={styles.tableCard}>
            <table className={styles.badgesTable}>
                <thead>
                    <tr>
                        <th>Badge</th>
                        <th className={styles.targetPct}>Target %</th>
                        <th className={styles.rewardCol}>Individual Reward</th>
                        <th className={styles.rewardCol}>Team Reward</th>
                        <th>Status</th>
                        <th style={{ width: '64px' }}></th>
                    </tr>
                </thead>
                <tbody>
                    {badges.map((badge) => (
                        <tr key={badge.id}>
                            <td className={styles.badgeName}>
                                <div className={styles.truncateText} title={badge.name}>
                                    {badge.name}
                                </div>
                            </td>
                            <td className={styles.targetPct}>{badge.targetPct}</td>
                            <td className={styles.rewardCol}>
                                {badge.individualReward ? (
                                    <div className={styles.rewardCell}>
                                        <button
                                            type="button"
                                            className={styles.editRewardIconBtn}
                                            aria-label={`Edit Individual Reward for ${badge.name}`}
                                            onClick={() =>
                                                onEditReward(
                                                    badge.id,
                                                    'individual',
                                                    badge.individualReward!,
                                                )
                                            }
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path
                                                    d="M12 20h9"
                                                    stroke="currentColor"
                                                    strokeWidth="1.8"
                                                    strokeLinecap="round"
                                                />
                                                <path
                                                    d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"
                                                    stroke="currentColor"
                                                    strokeWidth="1.8"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                        </button>
                                        {badge.individualReward.image ? (
                                            <div className={styles.rewardThumb} style={{ overflow: 'hidden' }}>
                                                <img
                                                    src={badge.individualReward.image}
                                                    alt="Individual reward"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    onError={(e) => {
                                                        const thumb = (e.currentTarget as HTMLImageElement).parentElement;
                                                        if (thumb) (thumb as HTMLElement).style.display = 'none';
                                                    }}
                                                />
                                            </div>
                                        ) : null}
                                        <span className={styles.truncateText} title={badge.individualReward.title}>
                                            {badge.individualReward.title}
                                        </span>
                                    </div>
                                ) : (
                                    <button
                                        className={styles.addRewardBtn}
                                        onClick={() => onAddReward(badge.id, 'individual')}
                                    >
                                        Add Reward
                                    </button>
                                )}
                            </td>
                            <td className={styles.rewardCol}>
                                {badge.teamReward ? (
                                    <div className={styles.rewardCell}>
                                        <button
                                            type="button"
                                            className={styles.editRewardIconBtn}
                                            aria-label={`Edit Team Reward for ${badge.name}`}
                                            onClick={() =>
                                                onEditReward(
                                                    badge.id,
                                                    'team',
                                                    badge.teamReward!,
                                                )
                                            }
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path
                                                    d="M12 20h9"
                                                    stroke="currentColor"
                                                    strokeWidth="1.8"
                                                    strokeLinecap="round"
                                                />
                                                <path
                                                    d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"
                                                    stroke="currentColor"
                                                    strokeWidth="1.8"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                        </button>
                                        {badge.teamReward.image ? (
                                            <div className={styles.rewardThumb} style={{ overflow: 'hidden' }}>
                                                <img
                                                    src={badge.teamReward.image}
                                                    alt="Team reward"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    onError={(e) => {
                                                        const thumb = (e.currentTarget as HTMLImageElement).parentElement;
                                                        if (thumb) (thumb as HTMLElement).style.display = 'none';
                                                    }}
                                                />
                                            </div>
                                        ) : null}
                                        <span className={styles.truncateText} title={badge.teamReward.title}>
                                            {badge.teamReward.title}
                                        </span>
                                    </div>
                                ) : (
                                    <button
                                        className={styles.addRewardBtn}
                                        onClick={() => onAddReward(badge.id, 'team')}
                                    >
                                        Add Reward
                                    </button>
                                )}
                            </td>
                            <td className={badge.status === 'Enabled' ? styles.statusEnabled : styles.statusDisabled}>
                                {badge.status}
                            </td>
                            <td style={{ position: 'relative', textAlign: 'center', verticalAlign: 'middle' }}>
                                <div className={styles.actionBtn} onClick={(e) => toggleMenu(e, badge.id)} style={{ display: 'inline-flex', padding: '8px' }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path fillRule="evenodd" clipRule="evenodd" d="M12 8C13.1046 8 14 7.10457 14 6C14 4.89543 13.1046 4 12 4C10.8954 4 10 4.89543 10 6C10 7.10457 10.8954 8 12 8ZM12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14ZM14 18C14 19.1046 13.1046 20 12 20C10.8954 20 10 19.1046 10 18C10 16.8954 10.8954 16 12 16C13.1046 16 14 16.8954 14 18Z" fill="#9CA3AF" />
                                    </svg>
                                    {openMenuId === badge.id && (
                                        <div className={styles.dropdownMenu} ref={menuRef} style={{ right: '16px', top: '36px' }}>
                                            <div
                                                className={styles.dropdownItem}
                                                onClick={() => { onEdit(badge); setOpenMenuId(null); }}
                                            >
                                                Edit
                                            </div>
                                            <div
                                                className={styles.dropdownItem}
                                                onClick={() => { onDelete(badge.id, badge.status); setOpenMenuId(null); }}
                                            >
                                                {badge.status === 'Enabled' ? 'Disable' : 'Enable'}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
