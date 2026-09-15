'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from '@/styles/notifications.module.css';
import langStyles from '@/styles/lang-content-tab.module.css';
import { useAvailableLanguages } from '@/hooks/useAvailableLanguages';

interface EmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    initialData?: any;
    isEdit: boolean;
    isSaving?: boolean;
    /** Language IDs selected during program creation (e.g. ["hi", "ml"]). */
    selectedLanguages?: string[];
}

type LangEntry = { subject: string; content: string };

const EmailModal: React.FC<EmailModalProps> = ({ isOpen, onClose, onSave, initialData, isEdit, isSaving, selectedLanguages }) => {
    const { availableLanguages } = useAvailableLanguages();
    const activeLangTabs = availableLanguages.filter(
        (lang) => !selectedLanguages || selectedLanguages.includes(lang.id),
    );
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [activeLangTab, setActiveLangTab] = useState('en');
    const [langData, setLangData] = useState<Record<string, LangEntry>>({});

    useEffect(() => {
        const translations = initialData?.translations || {};
        const init: Record<string, LangEntry> = {};
        availableLanguages.forEach((lang) => {
            init[lang.id] = {
                subject: translations[lang.id]?.subject || '',
                content: translations[lang.id]?.content || '',
            };
        });
        setLangData(init);
        setActiveLangTab('en');

        if (initialData) {
            setSubject(initialData.subject || '');
            setContent(initialData.content || '');
        } else {
            setSubject('');
            setContent('');
        }
    }, [initialData, isOpen, availableLanguages]);

    if (!isOpen) return null;

    const updateLangData = (langId: string, updates: Partial<LangEntry>) => {
        setLangData((prev) => ({ ...prev, [langId]: { ...prev[langId], ...updates } }));
    };

    const handleSave = () => {
        if (!subject.trim() || !content.trim()) return;
        onSave({
            id: initialData?.id,
            subject,
            content,
            translations: langData,
        });
    };

    const currentEntry = activeLangTab !== 'en' ? (langData[activeLangTab] || { subject: '', content: '' }) : null;
    const currentLang = activeLangTabs.find((l) => l.id === activeLangTab);

    return createPortal(
        <div className={styles.modalOverlay}>
            <div className={styles.modalContainer} style={{ width: '680px' }}>
                <div className={styles.modalHeader}>
                    {isEdit ? 'Edit Custom Notification' : 'Create Custom Notification'}
                </div>

                <div className={styles.modalBody}>
                    <div className={langStyles.langTabsRow}>
                        <button
                            className={`${langStyles.langTab} ${activeLangTab === 'en' ? langStyles.langTabActive : ''}`}
                            onClick={() => setActiveLangTab('en')}
                        >
                            English
                        </button>
                        {activeLangTabs.map((lang) => (
                            <button
                                key={lang.id}
                                className={`${langStyles.langTab} ${activeLangTab === lang.id ? langStyles.langTabActive : ''}`}
                                onClick={() => setActiveLangTab(lang.id)}
                            >
                                {lang.name}
                                <span className={`${langStyles.langTabNative} ${activeLangTab === lang.id ? langStyles.langTabActiveNative : ''}`}>
                                    {lang.nativeName}
                                </span>
                            </button>
                        ))}
                    </div>

                    {activeLangTab === 'en' ? (
                        <>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Subject Line</label>
                                <input
                                    className={styles.input}
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="e.g. Your Weekly Update for {program_name}"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Email Content (HTML allowed)</label>
                                <textarea
                                    className={styles.input}
                                    style={{ minHeight: '300px', fontFamily: 'monospace', resize: 'vertical' }}
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Enter the email body content..."
                                />
                            </div>
                        </>
                    ) : currentEntry && currentLang ? (
                        <>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Subject Line</label>
                                <input
                                    className={styles.input}
                                    value={currentEntry.subject}
                                    onChange={(e) => updateLangData(activeLangTab, { subject: e.target.value })}
                                    placeholder={`Enter subject in ${currentLang.name}`}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Email Content (HTML allowed)</label>
                                <textarea
                                    className={styles.input}
                                    style={{ minHeight: '300px', fontFamily: 'monospace', resize: 'vertical' }}
                                    value={currentEntry.content}
                                    onChange={(e) => updateLangData(activeLangTab, { content: e.target.value })}
                                    placeholder={`Enter the email body content in ${currentLang.name}...`}
                                />
                            </div>
                        </>
                    ) : null}
                </div>

                <div className={styles.modalFooter}>
                    <button className={styles.closeBtn} onClick={onClose}>Close</button>
                    <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving}>
                        {isSaving ? (
                            <><span className={styles.spinner}></span> Saving...</>
                        ) : (
                            isEdit ? 'Update Notification' : 'Save Custom Notification'
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default EmailModal;
