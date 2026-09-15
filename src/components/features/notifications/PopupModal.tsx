'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from '@/styles/notifications.module.css';
import langStyles from '@/styles/lang-content-tab.module.css';
import {
    convertUtcStringToPicker,
    getUserTimeZone,
    getTodayDateString,
} from '@/utils/date-time';
import { useAvailableLanguages } from '@/hooks/useAvailableLanguages';

interface PopupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    initialData?: any;
    isEdit?: boolean;
    isSaving?: boolean;
    programTimezone?: string;
    /** Language IDs selected during program creation (e.g. ["hi", "ml"]). */
    selectedLanguages?: string[];
}

type DateTimeVal = { date: string; hh: string; mm: string; period: string };
type LangEntry = { message: string; image: File | null; preview: string | null; fileName: string };

const parseDateTimeStr = (str: string, timeZone: string) => convertUtcStringToPicker(str, timeZone);

const defaultDT = (): DateTimeVal => ({ date: '', hh: '09', mm: '00', period: 'AM' });
const defaultUntilDT = (): DateTimeVal => ({ date: '', hh: '06', mm: '00', period: 'PM' });

export default function PopupModal({ isOpen, onClose, onSave, initialData, isEdit, isSaving, programTimezone, selectedLanguages }: PopupModalProps) {
    const { availableLanguages } = useAvailableLanguages();
    const activeLangTabs = availableLanguages.filter(
        (lang) => !selectedLanguages || selectedLanguages.includes(lang.id),
    );
    const [message, setMessage] = useState('');
    const [from, setFrom] = useState<DateTimeVal>(defaultDT());
    const [until, setUntil] = useState<DateTimeVal>(defaultUntilDT());
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>('');
    const [timeZone, setTimeZone] = useState(programTimezone || getUserTimeZone());
    const [activeLangTab, setActiveLangTab] = useState('en');
    const [langData, setLangData] = useState<Record<string, LangEntry>>({});
    const enFileInputRef = useRef<HTMLInputElement>(null);
    const langFileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const tz = programTimezone || getUserTimeZone();
        const translations: any[] = Array.isArray(initialData?.translations) ? initialData.translations : [];
        const init: Record<string, LangEntry> = {};
        availableLanguages.forEach((lang) => {
            const match = translations.find((t) => t.language_code === lang.id);
            init[lang.id] = {
                message: match?.message || '',
                image: null,
                preview: match?.image || null,
                fileName: match?.image ? 'Existing Image' : '',
            };
        });
        setLangData(init);
        setActiveLangTab('en');

        if (isOpen && initialData) {
            setMessage(initialData.message || '');
            const fromVal = initialData.from && typeof initialData.from === 'object'
                ? initialData.from
                : parseDateTimeStr(initialData.display_from || '', tz);
            const untilVal = initialData.until && typeof initialData.until === 'object'
                ? initialData.until
                : parseDateTimeStr(initialData.display_until || '', tz);
            setFrom(fromVal);
            setUntil(untilVal);
            setTimeZone(tz);
            setPreview(initialData.image_url || initialData.image || null);
            setFileName(initialData.image_url || initialData.image ? 'Existing Image' : '');
        } else if (isOpen && !initialData) {
            setMessage('');
            setFrom(defaultDT());
            setUntil(defaultUntilDT());
            setImage(null);
            setPreview(null);
            setFileName('');
            setTimeZone(tz);
        }
    }, [isOpen, initialData, programTimezone, availableLanguages]);

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
        if (!message.trim()) return;
        const langImages: Record<string, File> = {};
        activeLangTabs.forEach((lang) => {
            const entry = langData[lang.id];
            if (entry?.image) langImages[lang.id] = entry.image;
        });
        onSave({
            id: initialData?.id,
            message,
            from,
            until,
            timeZone,
            image,
            hasImage: !!(image || preview),
            translations: activeLangTabs
                .map((lang) => ({
                    language_code: lang.id,
                    message: langData[lang.id]?.message || '',
                }))
                .filter((t) => t.message.trim() || langImages[t.language_code]),
            langImages,
        });
    };

    const currentEntry = activeLangTab !== 'en' ? (langData[activeLangTab] || { message: '', image: null, preview: null, fileName: '' }) : null;
    const currentLang = activeLangTabs.find((l) => l.id === activeLangTab);

    const renderImageField = (isLang: boolean, currentFileName: string, currentPreview: string | null) => {
        const ref = isLang ? langFileInputRef : enFileInputRef;
        return (
            <div className={styles.formGroup}>
                <label className={styles.label}>Add Pop-up Image</label>
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

    const todayDateString = getTodayDateString();

    const renderDateTimeFields = (
        currentFrom: DateTimeVal,
        currentUntil: DateTimeVal,
        onFromChange: (v: DateTimeVal) => void,
        onUntilChange: (v: DateTimeVal) => void,
        readOnly = false,
    ) => {
        const minUntilDate = currentFrom.date && currentFrom.date > todayDateString ? currentFrom.date : todayDateString;
        const fieldClass = readOnly ? `${langStyles.readOnlySection}` : '';
        return (
        <>
            {readOnly && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className={langStyles.readOnlyBadge}>Read Only</span>
                    <p className={styles.hint} style={{ margin: 0, fontSize: '13px' }}>
                        Display window applies to all languages and is set on the English tab.
                    </p>
                </div>
            )}
            <div className={`${styles.formGroup} ${fieldClass}`}>
                <label className={styles.label}>Display From</label>
                <div className={styles.dateTimeRow} style={{ alignItems: 'flex-start' }}>
                    <div className={styles.dateInputWithIcon}>
                        <input
                            type="date"
                            className={`${styles.input} ${readOnly ? langStyles.readOnlyField : ''}`}
                            value={currentFrom.date}
                            min={todayDateString}
                            disabled={readOnly}
                            onChange={(e) => onFromChange({ ...currentFrom, date: e.target.value })}
                        />
                        <span className={styles.calendarMini}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M16 2V6" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M8 2V6" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M3 10H21" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <select className={`${styles.timeSelect} ${readOnly ? langStyles.readOnlyField : ''}`} value={currentFrom.hh} disabled={readOnly} onChange={(e) => onFromChange({ ...currentFrom, hh: e.target.value })}>
                                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                            <select className={`${styles.timeSelect} ${readOnly ? langStyles.readOnlyField : ''}`} value={currentFrom.mm} disabled={readOnly} onChange={(e) => onFromChange({ ...currentFrom, mm: e.target.value })}>
                                {['00', '15', '30', '45'].map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <select className={`${styles.timeSelect} ${readOnly ? langStyles.readOnlyField : ''}`} value={currentFrom.period} disabled={readOnly} onChange={(e) => onFromChange({ ...currentFrom, period: e.target.value })}>
                                <option value="AM">AM</option>
                                <option value="PM">PM</option>
                            </select>
                        </div>
                        <p className={styles.hint} style={{ paddingTop: '6px', margin: 0, fontSize: '13px' }}>
                            Timezone: <span style={{ color: 'var(--color-primary)' }}>{timeZone}</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className={`${styles.formGroup} ${fieldClass}`}>
                <label className={styles.label}>Display Until</label>
                <div className={styles.dateTimeRow} style={{ alignItems: 'flex-start' }}>
                    <div className={styles.dateInputWithIcon}>
                        <input
                            type="date"
                            className={`${styles.input} ${readOnly ? langStyles.readOnlyField : ''}`}
                            value={currentUntil.date}
                            min={minUntilDate}
                            disabled={readOnly}
                            onChange={(e) => onUntilChange({ ...currentUntil, date: e.target.value })}
                        />
                        <span className={styles.calendarMini}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M16 2V6" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M8 2V6" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M3 10H21" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <select className={`${styles.timeSelect} ${readOnly ? langStyles.readOnlyField : ''}`} value={currentUntil.hh} disabled={readOnly} onChange={(e) => onUntilChange({ ...currentUntil, hh: e.target.value })}>
                                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                            <select className={`${styles.timeSelect} ${readOnly ? langStyles.readOnlyField : ''}`} value={currentUntil.mm} disabled={readOnly} onChange={(e) => onUntilChange({ ...currentUntil, mm: e.target.value })}>
                                {['00', '15', '30', '45'].map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <select className={`${styles.timeSelect} ${readOnly ? langStyles.readOnlyField : ''}`} value={currentUntil.period} disabled={readOnly} onChange={(e) => onUntilChange({ ...currentUntil, period: e.target.value })}>
                                <option value="AM">AM</option>
                                <option value="PM">PM</option>
                            </select>
                        </div>
                        <p className={styles.hint} style={{ paddingTop: '6px', margin: 0, fontSize: '13px' }}>
                            Timezone: <span style={{ color: 'var(--color-primary)' }}>{timeZone}</span>
                        </p>
                    </div>
                </div>
            </div>
        </>
        );
    };

    return createPortal(
        <div className={styles.modalOverlay}>
            <div className={styles.modalContainer}>
                <div className={styles.modalHeader}>
                    {isEdit ? 'Edit Pop-up Notification' : 'Create Pop-up Notification'}
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
                            {renderImageField(false, fileName, preview)}
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Pop-up Message</label>
                                <textarea
                                    className={styles.input}
                                    style={{ minHeight: '100px', resize: 'vertical' }}
                                    placeholder="Enter the Pop-up Message"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                            </div>
                            {renderDateTimeFields(from, until, setFrom, setUntil)}
                        </>
                    ) : currentEntry && currentLang ? (
                        <>
                            {renderImageField(true, currentEntry.fileName, currentEntry.preview)}
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Pop-up Message</label>
                                <textarea
                                    className={styles.input}
                                    style={{ minHeight: '100px', resize: 'vertical' }}
                                    placeholder={`Enter the pop-up message in ${currentLang.name}`}
                                    value={currentEntry.message}
                                    onChange={(e) => updateLangData(activeLangTab, { message: e.target.value })}
                                />
                            </div>
                            {renderDateTimeFields(from, until, () => {}, () => {}, true)}
                        </>
                    ) : null}
                </div>

                <div className={styles.modalFooter}>
                    <button className={styles.closeBtn} onClick={onClose}>Close</button>
                    <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving}>
                        {isSaving ? (
                            <><span className={styles.spinner}></span> Saving...</>
                        ) : (
                            isEdit ? 'Update Pop-up' : 'Save Pop-up Notification'
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
