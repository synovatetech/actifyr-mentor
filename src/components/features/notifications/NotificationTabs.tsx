'use client';

import React from 'react';
import styles from '@/styles/notifications.module.css';

const tabs = [
    { id: 'push', label: 'Custom Push Notification' },
    { id: 'popup', label: 'Pop-up Notification' },
];

export default function NotificationTabs({ activeTab, onTabChange }: { activeTab: string, onTabChange: (id: string) => void }) {
    return (
        <div className={styles.tabsContainer}>
            {tabs.map((tab) => (
                <div
                    key={tab.id}
                    className={`${styles.tabItem} ${activeTab === tab.id ? styles.activeTab : ''}`}
                    onClick={() => onTabChange(tab.id)}
                >
                    {tab.label}
                </div>
            ))}
        </div>
    );
}
