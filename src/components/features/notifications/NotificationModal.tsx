'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from '@/styles/notifications.module.css';
import langStyles from '@/styles/lang-content-tab.module.css';
import { useAvailableLanguages } from '@/hooks/useAvailableLanguages';

interface NotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    initialData?: any;
    isEdit?: boolean;
    isSaving?: boolean;
    /** Language IDs selected during program creation (e.g. ["hi", "ml"]). */
    selectedLanguages?: string[];
}

type LangEntry = { title: string; body: string; image: File | null; preview: string | null; fileName: string };

export default function NotificationModal({ isOpen, onClose, onSave, initialData, isEdit, isSaving, selectedLanguages }: NotificationModalProps) {
    const { availableLanguages } = useAvailableLanguages();
    const activeLangTabs = availableLanguages.filter(
        (lang) => !selectedLanguages || selectedLanguages.includes(lang.id),
    );
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>('');
    const [activeLangTab, setActiveLangTab] = useState('en');
    const [langData, setLangData] = useState<Record<string, LangEntry>>({});
    const enFileInputRef = useRef<HTMLInputElement>(null);
    const langFileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const translations: any[] = Array.isArray(initialData?.translations) ? initialData.translations : [];
        const init: Record<string, LangEntry> = {};
        availableLanguages.forEach((lang) => {
            const match = translations.find((t) => t.language_code === lang.id);
            init[lang.id] = {
                title: match?.title || '',
                body: match?.body || '',
                image: null,
                preview: match?.image || null,
                fileName: match?.image ? 'Existing Image' : '',
            };
        });
        setLangData(init);
        setActiveLangTab('en');

        if (initialData) {
            setTitle(initialData.title || '');
            setBody(initialData.body || '');
            setPreview(initialData.image_url || initialData.image || null);
            setFileName(initialData.image_url || initialData.image ? 'Existing Image' : '');
        } else {
            setTitle('');
            setBody('');
            setImage(null);
            setPreview(null);
            setFileName('');
        }
    }, [initialData, isOpen, availableLanguages]);

    if (!isOpen) return null;

    const updateLangData = (langId: string, updates: Partial<LangEntry>) => {
        setLangData((prev) => ({ ...prev, [langId]: { ...prev[langId], ...updates } }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (activeLangTab === 'en') {
                setImage(file);
                setPreview(URL.createObjectURL(file));
                setFileName(file.name);
            } else {
                updateLangData(activeLangTab, {
                    image: file,
                    preview: URL.createObjectURL(file),
                    fileName: file.name,
                });
            }
        }
    };

    const removeImage = (e: React.MouseEvent, isLang?: boolean) => {
        e.stopPropagation();
        if (isLang) {
            updateLangData(activeLangTab, { image: null, preview: null, fileName: '' });
        } else {
            setImage(null);
            setPreview(null);
            setFileName('');
        }
    };

    const handleSave = () => {
        if (!title.trim() || !body.trim()) return;
        const langImages: Record<string, File> = {};
        activeLangTabs.forEach((lang) => {
            const entry = langData[lang.id];
            if (entry?.image) langImages[lang.id] = entry.image;
        });
        onSave({
            id: initialData?.id,
            title,
            body,
            image,
            hasImage: !!(image || preview),
            translations: activeLangTabs
                .map((lang) => ({
                    language_code: lang.id,
                    title: langData[lang.id]?.title || '',
                    body: langData[lang.id]?.body || '',
                }))
                .filter((t) => t.title.trim() || t.body.trim() || langImages[t.language_code]),
            langImages,
        });
    };

    const currentEntry = activeLangTab !== 'en' ? (langData[activeLangTab] || { title: '', body: '', image: null, preview: null, fileName: '' }) : null;
    const currentLang = activeLangTabs.find((l) => l.id === activeLangTab);

    const renderImageField = (
        isLang: boolean,
        currentFileName: string,
        currentPreview: string | null,
    ) => {
        const ref = isLang ? langFileInputRef : enFileInputRef;
        return (
            <div className={styles.formGroup}>
                <label className={styles.label}>Add Image <span>(Optional)</span></label>
                {currentFileName ? (
                    <div className={styles.selectedFileCard}>
                        <div className={styles.fileInfo}>
                            <div className={styles.fileThumbWrapper}>
                                {currentPreview ? (
                                    <img src={currentPreview} alt="Preview" className={styles.modalFileThumb} />
                                ) : (
                                    <span className={styles.imageIcon}>🖼️</span>
                                )}
                            </div>
                            <span className={styles.fileNameLabel}>{currentFileName}</span>
                        </div>
                        <div className={styles.removeFileAction} onClick={(e) => removeImage(e, isLang)}>✕</div>
                    </div>
                ) : (
                    <div className={styles.dropzone} onClick={() => ref.current?.click()}>
                        <p className={styles.dropzoneText}>Drag & Drop file here or</p>
                        <button className={styles.dropzoneBtn}>Browse File</button>
                        <input ref={ref} type="file" hidden accept="image/*" onChange={handleFileChange} />
                    </div>
                )}
            </div>
        );
    };

    return createPortal(
        <div className={styles.modalOverlay}>
            <div className={styles.modalContainer}>
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
                                <label className={styles.label}>Notification Title <span>(Heading)</span></label>
                                <input
                                    className={styles.input}
                                    placeholder="Enter Title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Notification Body <span>(Message)</span></label>
                                <input
                                    className={styles.input}
                                    placeholder="Enter Message"
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                />
                            </div>
                            {renderImageField(false, fileName, preview)}
                        </>
                    ) : currentEntry && currentLang ? (
                        <>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Notification Title <span>(Heading)</span></label>
                                <input
                                    className={styles.input}
                                    placeholder={`Enter title in ${currentLang.name}`}
                                    value={currentEntry.title}
                                    onChange={(e) => updateLangData(activeLangTab, { title: e.target.value })}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Notification Body <span>(Message)</span></label>
                                <input
                                    className={styles.input}
                                    placeholder={`Enter message in ${currentLang.name}`}
                                    value={currentEntry.body}
                                    onChange={(e) => updateLangData(activeLangTab, { body: e.target.value })}
                                />
                            </div>
                            {renderImageField(true, currentEntry.fileName, currentEntry.preview)}
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
}
