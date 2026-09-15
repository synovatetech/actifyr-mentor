'use client';

import React from 'react';
import styles from '@/styles/notifications.module.css';

interface PopupCardProps {
    popup: {
        id: string | number;
        message: string;
        from: { date: string, hh: string, mm: string, period: string };
        until: { date: string, hh: string, mm: string, period: string };
        hasImage: boolean;
        image_url?: string;
        image?: string;
        translations?: Array<{ language_code: string; message?: string; image?: string | null }>;
    };
    onEdit: (p: any) => void;
    onDelete: (id: string | number) => void;
    activeLangTabs?: { id: string; name: string; nativeName?: string }[];
}

export default function PopupCard({ popup, onEdit, onDelete, activeLangTabs = [] }: PopupCardProps) {
    const [showMenu, setShowMenu] = React.useState(false);
    const [selectedLang, setSelectedLang] = React.useState('en');
    const menuRef = React.useRef<HTMLDivElement>(null);

    const translationsByLang = Object.fromEntries(
        (popup.translations || []).map((t) => [t.language_code, t]),
    );
    const displayMessage = selectedLang === 'en' ? popup.message : (translationsByLang[selectedLang]?.message || '');
    const displayImage = selectedLang === 'en'
        ? (popup.image_url || popup.image)
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

    const formatDate = (dateStr: string) => {
        if (!dateStr || !dateStr.includes('-')) return dateStr;
        const [year, month, day] = dateStr.split('-');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
    };

    return (
        <div className={styles.notificationCard}>
            <div className={`${styles.cardImagePlaceholder} ${!displayImage ? styles.noImagePlaceholder : ''}`}>
                {displayImage ? (
                    <img
                        src={displayImage}
                        alt="Popup"
                        className={styles.cardImage}
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.classList.add(styles.noImagePlaceholder);
                        }}
                    />
                ) : (
                    "No Image"
                )}

                {/* Overlay Menu for Popup Card */}
                <div className={styles.overlayMenuContainer} ref={menuRef}>
                    <div className={styles.moreMenu} onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(!showMenu);
                    }}>⋮</div>
                    {showMenu && (
                        <div className={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                            <div className={styles.dropdownItem} onClick={(e) => {
                                e.stopPropagation();
                                onDelete(popup.id);
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
                        const hasTranslation = !!translationsByLang[lang.id]?.message?.trim();
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
                {displayMessage || (selectedLang !== 'en' && <span className={styles.cardTranslationEmpty}>No translation yet</span>)}
            </p>

            <div className={styles.cardDetails}>
                <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>From</span>
                    <span className={styles.detailValue}>{popup.from.hh}:{popup.from.mm} {popup.from.period}, {formatDate(popup.from.date)}</span>
                </div>
                <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Until</span>
                    <span className={styles.detailValue}>{popup.until.hh}:{popup.until.mm} {popup.until.period}, {formatDate(popup.until.date)}</span>
                </div>
            </div>

            <div className={styles.cardActions}>
                <button className={styles.actionBtn} onClick={() => onEdit(popup)}>
                    Edit
                </button>
            </div>
        </div>
    );
}
