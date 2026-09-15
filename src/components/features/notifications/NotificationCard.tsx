'use client';

import React from 'react';
import styles from '@/styles/notifications.module.css';

interface NotificationCardProps {
    notification: {
        id: string | number;
        title: string;
        body: string;
        hasImage: boolean;
        image_url?: string;
        image?: string;
        translations?: Array<{ language_code: string; title?: string; body?: string; image?: string | null }>;
    };
    onEdit: (n: any) => void;
    onDelete: (id: string | number) => void;
    onSend: (id: string | number) => void;
    activeLangTabs?: { id: string; name: string; nativeName?: string }[];
}

export default function NotificationCard({ notification, onEdit, onDelete, onSend, activeLangTabs = [] }: NotificationCardProps) {
    const [showMenu, setShowMenu] = React.useState(false);
    const [isSending, setIsSending] = React.useState(false);
    const [selectedLang, setSelectedLang] = React.useState('en');
    const menuRef = React.useRef<HTMLDivElement>(null);

    const translationsByLang = Object.fromEntries(
        (notification.translations || []).map((t) => [t.language_code, t]),
    );
    const displayTitle = selectedLang === 'en' ? notification.title : (translationsByLang[selectedLang]?.title || '');
    const displayBody = selectedLang === 'en' ? notification.body : (translationsByLang[selectedLang]?.body || '');
    const displayImage = selectedLang === 'en'
        ? (notification.image_url || notification.image)
        : (translationsByLang[selectedLang]?.image || undefined);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);

    const handleSendClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isSending) return;
        setIsSending(true);
        try {
            await onSend(notification.id);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className={styles.notificationCard}>
            <div className={`${styles.cardImagePlaceholder} ${!displayImage ? styles.noImagePlaceholder : ''}`}>
                {displayImage ? (
                    <img
                        src={displayImage}
                        alt={displayTitle}
                        className={styles.cardImage}
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.classList.add(styles.noImagePlaceholder);
                        }}
                    />
                ) : (
                    "No Image"
                )}
            </div>

            <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle} title={displayTitle}>
                    {displayTitle || <span className={styles.cardTranslationEmpty}>No translation yet</span>}
                </h3>
                <div className={styles.moreMenuContainer} ref={menuRef}>
                    <div className={styles.moreMenu} onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(!showMenu);
                    }}>⋮</div>
                    {showMenu && (
                        <div className={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                            <div className={styles.dropdownItem} onClick={(e) => {
                                e.stopPropagation();
                                onDelete(notification.id);
                                setShowMenu(false);
                            }}>
                                Delete
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {activeLangTabs.length > 0 && (
                <div className={styles.cardLangRow}>
                    <button
                        type="button"
                        className={`${styles.cardLangChip} ${selectedLang === 'en' ? styles.cardLangChipActive : ''}`}
                        onClick={(e) => { e.stopPropagation(); setSelectedLang('en'); }}
                    >
                        EN
                    </button>
                    {activeLangTabs.map((lang) => {
                        const hasTranslation = !!translationsByLang[lang.id]?.title?.trim();
                        return (
                            <button
                                key={lang.id}
                                type="button"
                                className={`${styles.cardLangChip} ${selectedLang === lang.id ? styles.cardLangChipActive : ''} ${!hasTranslation ? styles.cardLangChipMissing : ''}`}
                                onClick={(e) => { e.stopPropagation(); setSelectedLang(lang.id); }}
                                title={hasTranslation ? undefined : `No ${lang.name} translation yet`}
                            >
                                {lang.nativeName || lang.name}
                            </button>
                        );
                    })}
                </div>
            )}

            <p className={styles.cardBody}>
                {displayBody || (selectedLang !== 'en' && <span className={styles.cardTranslationEmpty}>No translation yet</span>)}
            </p>

            <div className={styles.cardActions}>
                <button className={`${styles.actionBtn} ${styles.editBtn}`} onClick={() => onEdit(notification)}>
                    Edit
                </button>
                <button
                    className={`${styles.actionBtn} ${styles.sendBtn} ${isSending ? styles.btnLoading : ''}`}
                    onClick={handleSendClick}
                    disabled={isSending}
                >
                    {isSending ? (
                        <>
                            <span className={styles.spinner}></span>
                            Sending...
                        </>
                    ) : (
                        'Send'
                    )}
                </button>
            </div>
        </div>
    );
}
