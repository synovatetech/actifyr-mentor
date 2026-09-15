'use client';
import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import styles from '@/styles/modular-learning.module.css';
import langStyles from '@/styles/lang-content-tab.module.css';
import formStyles from '@/styles/add-content-modal.module.css';
import SharedContentForm, { useSharedContentForm } from '@/components/features/content/SharedContentForm';
import LanguageContentTab, { type LangTabData } from '@/components/features/content/LanguageContentTab';
import ConfirmCloseModal from '@/components/common/ConfirmCloseModal';
import { contentService } from '@/services';
import { buildContentTranslationFormData, getMissingTranslationSections, normalizeContentData } from '@/utils/content-helper';
import {
    downloadContentUploadTemplate,
    parseContentUploadTemplate,
} from '@/utils/content-upload-template';
import { isValidMicroAction } from '@/utils/task-options';
import { convertUtcStringToPicker, getUserTimeZone } from '@/utils/date-time';
import { useToast } from '@/context/ToastContext';
import { useContentMissingTranslations, missingTranslationsKeys } from '@/hooks/useMissingTranslations';
import { useAvailableLanguages } from '@/hooks/useAvailableLanguages';
import { MissingTranslationIcon } from '@/components/common/icons/MissingTranslationIcon';

/** Strip HTML tags and collapse whitespace to plain text. */
function extractPlainText(html: string): string {
    return String(html || '')
        .replace(/<[^>]*>?/gm, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

interface AddContentModalProps {
    onClose: () => void;
    onSave: (item: any) => void;
    onDelete?: (id: string) => void;
    initialData?: any;
    isLoading?: boolean;
    programTimezone?: string;
    programId?: string | number;
    isTrial?: boolean;
    dateTimeRequired?: boolean;
    defaultLinked?: boolean;
    /** Language IDs selected during program creation (e.g. ["hi", "ml"]). */
    selectedLanguages?: string[];
}

export default function AddContentModal({ onClose, onSave, onDelete, initialData, isLoading, programTimezone, programId, isTrial = false, dateTimeRequired = true, defaultLinked = false, selectedLanguages }: AddContentModalProps) {
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    // Active language tab: "en" or a language id like "hi", "ml"
    const [activeLangTab, setActiveLangTab] = useState('en');
    // Per-language tab data (media, questions, tasks)
    const [langTabData, setLangTabData] = useState<Record<string, LangTabData>>({});
    // Tracks which language's translation is currently being saved (per-tab dynamic Save button).
    const [translatingLang, setTranslatingLang] = useState<string | null>(null);
    // Bumped per-language after a successful translation save, to force LanguageContentTab
    // to re-apply the freshly persisted data (real ids for new media/tasks/questions).
    const [translationRefreshTick, setTranslationRefreshTick] = useState<Record<string, number>>({});

    const { availableLanguages } = useAvailableLanguages();
    const activeLangTabs = availableLanguages.filter(
        (lang) =>
            !selectedLanguages ||
            selectedLanguages.includes(lang.id),
    );

    // Only relevant when editing existing content — a new item has no id to check yet.
    const contentIdForTranslationStatus = initialData?.id ?? initialData?.content_id;
    const { data: missingTranslations } = useContentMissingTranslations(
        contentIdForTranslationStatus,
        !!contentIdForTranslationStatus,
    );
    const refetchMissingTranslations = () => {
        if (contentIdForTranslationStatus) {
            queryClient.invalidateQueries({
                queryKey: missingTranslationsKeys.content(contentIdForTranslationStatus),
            });
        }
    };

    const defaultLangTabData = (): LangTabData => ({
        title: '',
        content: '',
        mediaItems: [],
        questionnaires: [],
        taskDescriptions: [],
        resourceLabels: [],
    });

    const updateLangTabData = (langId: string, updates: Partial<LangTabData>) => {
        setLangTabData((prev) => {
            const existing = prev[langId] ?? defaultLangTabData();
            return { ...prev, [langId]: { ...existing, ...updates } };
        });
    };

    const getLangTabData = (langId: string): LangTabData =>
        langTabData[langId] ?? defaultLangTabData();

    const csvInputRef = useRef<HTMLInputElement>(null);

    // Top Config State
    const [date, setDate] = useState('');
    const [time, setTime] = useState({ hh: 'hh', mm: 'mm', ampm: 'AM' });
    const [isLinked, setIsLinked] = useState(defaultLinked);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [validationError, setValidationError] = useState('');
    const timeZone = programTimezone || getUserTimeZone();

    // Virtual Meeting State
    const [meetingEnabled, setMeetingEnabled] = useState(false);
    const [meetingLink, setMeetingLink] = useState('');
    const [meetingHour, setMeetingHour] = useState('10');
    const [meetingMinute, setMeetingMinute] = useState('00');
    const [meetingAmPm, setMeetingAmPm] = useState('AM');

    // Use Shared Form Hook
    const {
        title, setTitle: setTitleRaw,
        content, setContent,
        resources, setResources,
        mediaItems, setMediaItems,
        tasks, setTasks,
        questionnaires, setQuestionnaires
    } = useSharedContentForm(initialData);

    const setTitle = (val: string) => {
        setTitleRaw(val);
        if (val.trim()) setValidationError('');
    };

    // Last-saved snapshot for the English tab (dirty checks on tab switch),
    // and per-language for translation tabs (keyed by langId).
    const normalizedInitialRef = useRef<any>(null);
    const langBaselineRef = useRef<Record<string, Partial<LangTabData>>>({});
    const [pendingTabSwitch, setPendingTabSwitch] = useState<string | null>(null);
    const [isSwitchSaving, setIsSwitchSaving] = useState(false);

    useEffect(() => {
        if (initialData) {
            const normalized = normalizeContentData(initialData);
            normalizedInitialRef.current = normalized ? {
                title: normalized.title || '',
                content: normalized.content || '',
                mediaItems: normalized.mediaItems || [],
                tasks: normalized.tasks || [],
                questionnaires: normalized.questionnaires || [],
            } : null;
        } else {
            normalizedInitialRef.current = null;
        }
    }, [initialData]);

    useEffect(() => {
        if (initialData) {
            setIsLinked(defaultLinked || initialData.link_to_previous_content === true || initialData.link_to_previous_content === 'true' || initialData.link_to_previous_content === 1);
            // Use date_time (UTC combined field) for timezone-aware parsing
            const dateTimeUtc = initialData.date_time ?? initialData.date ?? '';
            if (dateTimeUtc) {
                const parsed = convertUtcStringToPicker(dateTimeUtc, timeZone);
                if (parsed.date) setDate(parsed.date);
                if (parsed.hh !== '12' || parsed.mm !== '00' || dateTimeUtc.includes('T')) {
                    setTime({ hh: parsed.hh, mm: parsed.mm, ampm: parsed.period });
                }
            }

            // Virtual Meeting
            setMeetingEnabled(initialData.meet_available === true || initialData.meet_available === 'true');
            setMeetingLink(initialData.meet_link || initialData.meeting_link || '');
            if (initialData.meet_time) {
                const mt = String(initialData.meet_time).trim();
                const ampmMatch = mt.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
                if (ampmMatch) {
                    setMeetingHour(ampmMatch[1].padStart(2, '0'));
                    setMeetingMinute(ampmMatch[2]);
                    setMeetingAmPm(ampmMatch[3].toUpperCase());
                } else {
                    const parts = mt.split(':');
                    let h = parseInt(parts[0], 10);
                    const m = parts[1]?.slice(0, 2) || '00';
                    let ap = 'AM';
                    if (h >= 12) { ap = 'PM'; if (h > 12) h -= 12; }
                    else if (h === 0) { h = 12; }
                    setMeetingHour(String(h).padStart(2, '0'));
                    setMeetingMinute(m);
                    setMeetingAmPm(ap);
                }
            } else {
                setMeetingHour('10');
                setMeetingMinute('00');
                setMeetingAmPm('AM');
            }
        } else {
            setDate('');
            setTime({ hh: 'hh', mm: 'mm', ampm: 'AM' });
            setIsLinked(defaultLinked);
            setMeetingEnabled(false);
            setMeetingLink('');
            setMeetingHour('10');
            setMeetingMinute('00');
            setMeetingAmPm('AM');
        }
        setValidationError('');
    }, [initialData, timeZone]);

    const handleSave = (): boolean => {
        if (dateTimeRequired && !date) {
            setValidationError('Date is required.');
            showToast('Date is required.', 'error');
            return false;
        }
        if (dateTimeRequired && (time.hh === 'hh' || time.mm === 'mm')) {
            setValidationError('Time is required.');
            showToast('Time is required.', 'error');
            return false;
        }
        if (!title.trim()) {
            setValidationError('Title is required.');
            showToast('Title is required.', 'error');
            return false;
        }
        if (!extractPlainText(content)) {
            setValidationError('Content is required.');
            showToast('Content is required.', 'error');
            return false;
        }
        const taskWithInvalidAction = tasks.find((t) =>
            (t.action || []).some((a) => !isValidMicroAction(a)),
        );
        if (taskWithInvalidAction) {
            const invalid = taskWithInvalidAction.action.find((a) => !isValidMicroAction(a));
            setValidationError('One of the tasks has an unsupported micro-action.');
            showToast(
                `Task "${taskWithInvalidAction.title || 'Untitled'}" has an unsupported micro-action ("${invalid}"). Open the task and remove it before saving.`,
                'error',
            );
            return false;
        }
        setValidationError('');

        const item: Record<string, any> = {
            id: initialData?.id || initialData?.content_id,
            title: title,
            content: content,
            date: date,
            time: `${time.hh}:${time.mm} ${time.ampm}`,
            timeZone: timeZone,
            link_to_previous_content: isLinked,

            // Virtual Meeting
            meet_available: meetingEnabled,
            meet_link: meetingLink,
            meet_time: `${meetingHour}:${meetingMinute} ${meetingAmPm}`,

            // Rich Data
            resources: resources,
            mediaItems: mediaItems,
            tasks: tasks,
            questionnaires: questionnaires,
        };

        // With other languages to fill in, keep the modal open after saving English
        // so the admin can switch tabs without having to reopen it.
        item.keepModalOpen = activeLangTabs.length > 0;

        onSave(item);
        refetchMissingTranslations();
        // Move the "last saved" baseline forward so a later tab-switch/close doesn't
        // treat this just-saved state as unsaved.
        normalizedInitialRef.current = { title, content, mediaItems, tasks, questionnaires };
        return true;
    };

    const handleUploadTemplateClick = () => {
        csvInputRef.current?.click();
    };

    const handleTemplateUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const csvText = await file.text();
            const parsed = parseContentUploadTemplate(csvText);

            setTitle(parsed.title);
            setContent(parsed.content);
            setQuestionnaires(parsed.questionnaires);
            setTasks(parsed.tasks);

            showToast(
                `Template imported successfully. Loaded ${parsed.questionnaires.length} assessment question(s) and ${parsed.tasks.length} task(s).`,
                'success',
            );
            if (parsed.warnings.length > 0) {
                showToast(
                    `${parsed.warnings.length} value(s) in the CSV weren't recognized and were skipped: ${parsed.warnings.join(' ')}`,
                    'error',
                );
            }
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Unable to import this CSV file. Please check the template format.';
            showToast(message, 'error');
        } finally {
            event.target.value = '';
        }
    };

    const contentIdForDelete = initialData?.id ?? initialData?.content_id;
    const canDeleteContent =
        contentIdForDelete !== null &&
        contentIdForDelete !== undefined &&
        String(contentIdForDelete).trim() !== '';

    const handleSaveTranslation = async (langId: string): Promise<boolean> => {
        const contentId = initialData?.id ?? initialData?.content_id;
        if (!contentId) {
            showToast('Save the English content first before adding translations.', 'error');
            return false;
        }

        const langData = getLangTabData(langId);
        const langName = availableLanguages.find((l) => l.id === langId)?.name || langId;
        const missingSections = getMissingTranslationSections(langData, title, content, tasks, questionnaires);
        if (missingSections.length > 0) {
            showToast(`Please fill in ${missingSections.join(', ')} for ${langName} before saving.`, 'error');
            return false;
        }

        const translationFormData = buildContentTranslationFormData(
            langId,
            langData,
            questionnaires,
            tasks,
            mediaItems,
        );
        if (!translationFormData) {
            showToast('Add some translated content before saving.', 'error');
            return false;
        }

        setTranslatingLang(langId);
        try {
            const res = await contentService.translate(contentId, translationFormData);
            if (res.success) {
                showToast(`${langName} translation saved successfully`, 'success');
                refetchMissingTranslations();
                // Recall this language's own content-detail data so the tab reflects
                // the backend-confirmed state (real ids for new media/tasks/questions).
                queryClient.invalidateQueries({ queryKey: ['lang-content', langId, programId, contentId] });
                setTranslationRefreshTick((prev) => ({ ...prev, [langId]: (prev[langId] ?? 0) + 1 }));
                // Move this language's "last saved" baseline forward.
                langBaselineRef.current[langId] = langData;
                return true;
            }
            showToast(res.error || res.message || 'Failed to save translation', 'error');
            return false;
        } catch (error) {
            console.error('Error saving translation:', error);
            showToast('An error occurred while saving translation', 'error');
            return false;
        } finally {
            setTranslatingLang(null);
        }
    };

    // Ordered tab sequence (English first, then each configured language) — drives
    // "Save & Next"/"Save & Close" so the last tab collapses to a single CTA.
    const tabSequence = ['en', ...activeLangTabs.map((lang) => lang.id)];
    const currentTabIdx = tabSequence.indexOf(activeLangTab);
    const isLastTab = currentTabIdx === tabSequence.length - 1;
    const nextTabId = !isLastTab ? tabSequence[currentTabIdx + 1] : null;

    const handleSaveAndNext = () => {
        if (handleSave() && nextTabId) {
            setActiveLangTab(nextTabId);
        }
    };

    const handleSaveTranslationAndNext = async (langId: string) => {
        if ((await handleSaveTranslation(langId)) && nextTabId) {
            setActiveLangTab(nextTabId);
        }
    };

    const handleSaveTranslationAndClose = async (langId: string) => {
        if (await handleSaveTranslation(langId)) {
            onClose();
        }
    };

    const cleanTextForCompare = (html: string) =>
        (html || '').replace(/<[^>]*>?/gm, '').replace(/\s+/g, '').trim();

    const isEnglishDirty = (): boolean => {
        const orig = normalizedInitialRef.current;
        if (!orig) {
            return (
                title.trim() !== '' ||
                cleanTextForCompare(content) !== '' ||
                mediaItems.length > 0 ||
                tasks.length > 0 ||
                questionnaires.length > 0
            );
        }
        return (
            title !== orig.title ||
            cleanTextForCompare(content) !== cleanTextForCompare(orig.content) ||
            mediaItems.length !== orig.mediaItems.length ||
            tasks.length !== orig.tasks.length ||
            questionnaires.length !== orig.questionnaires.length
        );
    };

    const isLangDirty = (langId: string): boolean => {
        const current = getLangTabData(langId);
        const baseline = langBaselineRef.current[langId];
        if (!baseline) {
            return (
                (current.title || '').trim() !== '' ||
                cleanTextForCompare(current.content) !== '' ||
                (current.taskDescriptions || []).some((d) => d.trim() !== '') ||
                (current.questionnaires || []).length > 0 ||
                (current.mediaItems || []).length > 0 ||
                (current.resourceLabels || []).some((l) => l.trim() !== '')
            );
        }
        return (
            (current.title || '') !== (baseline.title || '') ||
            cleanTextForCompare(current.content) !== cleanTextForCompare(baseline.content || '') ||
            JSON.stringify(current.taskDescriptions || []) !== JSON.stringify(baseline.taskDescriptions || []) ||
            (current.questionnaires || []).length !== (baseline.questionnaires || []).length ||
            (current.mediaItems || []).length !== (baseline.mediaItems || []).length ||
            JSON.stringify(current.resourceLabels || []) !== JSON.stringify(baseline.resourceLabels || [])
        );
    };

    const isCurrentTabDirty = (): boolean =>
        activeLangTab === 'en' ? isEnglishDirty() : isLangDirty(activeLangTab);

    const attemptTabSwitch = (targetTabId: string) => {
        if (targetTabId === activeLangTab) return;
        if (isCurrentTabDirty()) {
            setPendingTabSwitch(targetTabId);
            return;
        }
        setActiveLangTab(targetTabId);
    };

    const handleDiscardAndSwitch = () => {
        if (!pendingTabSwitch) return;
        if (activeLangTab === 'en') {
            const orig = normalizedInitialRef.current;
            setTitle(orig?.title || '');
            setContent(orig?.content || '');
            setMediaItems(orig?.mediaItems || []);
            setTasks(orig?.tasks || []);
            setQuestionnaires(orig?.questionnaires || []);
        } else {
            const baseline = langBaselineRef.current[activeLangTab] || {};
            updateLangTabData(activeLangTab, {
                title: baseline.title || '',
                content: baseline.content || '',
                mediaItems: baseline.mediaItems || [],
                questionnaires: baseline.questionnaires || [],
                taskDescriptions: baseline.taskDescriptions || [],
                resourceLabels: baseline.resourceLabels || [],
            });
        }
        setActiveLangTab(pendingTabSwitch);
        setPendingTabSwitch(null);
    };

    const handleSaveAndSwitchTab = async () => {
        if (!pendingTabSwitch) return;
        setIsSwitchSaving(true);
        try {
            const success = activeLangTab === 'en' ? handleSave() : await handleSaveTranslation(activeLangTab);
            if (success) {
                setActiveLangTab(pendingTabSwitch);
                setPendingTabSwitch(null);
            }
        } finally {
            setIsSwitchSaving(false);
        }
    };

    const handleClose = () => {
        const cleanContent = (html: string) => html.replace(/<[^>]*>?/gm, '').replace(/\s+/g, '').trim();

        if (!initialData) {
            const hasUnsavedChanges = title.trim() !== '' || cleanContent(content) !== '' || mediaItems.length > 0 || tasks.length > 0 || questionnaires.length > 0;
            if (hasUnsavedChanges) {
                setShowCloseConfirm(true);
                return;
            }
        } else {
            const d = initialData;
            const origTitle = d.title || '';
            const origContent = d.content || '';

            const contentChanged = cleanContent(content) !== cleanContent(origContent);

            const hasChanged = title !== origTitle ||
                contentChanged ||
                mediaItems.length !== (d.mediaItems || d.media_files_metadata || d.media_files || d.media || []).length ||
                tasks.length !== (d.tasks || d.tasks_metadata || []).length ||
                questionnaires.length !== (d.questionnaires || d.questionnaires_metadata || []).length;

            if (hasChanged) {
                setShowCloseConfirm(true);
                return;
            }
        }
        onClose();
    };

    return createPortal(
        <div className={styles.modalOverlay}>
            <div className={styles.modalContainer}>
                <div className={styles.modalHeader}>
                    <div className={styles.modalTitle}>{initialData ? 'Edit Content' : 'Content Configuration'}</div>
                    <div className={styles.closeIcon} onClick={handleClose}>✕</div>
                </div>

                <div className={styles.modalBody}>
                    <div style={isTrial ? { pointerEvents: 'none', userSelect: 'none' } : undefined}>
                    {isLoading && (
                        <div className={styles.loadingOverlay}>
                            <div className={styles.spinner}></div>
                            <span>Please wait... Saving your content</span>
                        </div>
                    )}

                    {/* Language tabs — En is always shown; additional tabs from selectedLanguages */}
                    {activeLangTabs.length > 0 && (
                        <div className={langStyles.langTabsRow}>
                            <button
                                className={`${langStyles.langTab} ${activeLangTab === 'en' ? langStyles.langTabActive : ''}`}
                                onClick={() => attemptTabSwitch('en')}
                            >
                                English
                            </button>
                            {activeLangTabs.map((lang) => {
                                const isIncomplete = missingTranslations?.languages?.some(
                                    (l) => l.language_code === lang.id && !l.is_complete,
                                );
                                return (
                                    <button
                                        key={lang.id}
                                        className={`${langStyles.langTab} ${activeLangTab === lang.id ? langStyles.langTabActive : ''}`}
                                        onClick={() => canDeleteContent && attemptTabSwitch(lang.id)}
                                        disabled={!canDeleteContent}
                                        title={!canDeleteContent ? 'Save the English content first to add translations' : undefined}
                                    >
                                        {lang.name}
                                        <span className={`${langStyles.langTabNative} ${activeLangTab === lang.id ? langStyles.langTabActiveNative : ''}`}>
                                            {lang.nativeName}
                                        </span>
                                        {isIncomplete && (
                                            <span title="Missing translations">
                                                <MissingTranslationIcon />
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Language tab content */}
                    {activeLangTab !== 'en' && (() => {
                        const lang = availableLanguages.find((l) => l.id === activeLangTab);
                        if (!lang) return null;
                        return (
                            <LanguageContentTab
                                langId={lang.id}
                                langName={lang.name}
                                programId={programId}
                                contentId={initialData?.id ?? initialData?.content_id}
                                enMediaItems={mediaItems}
                                enQuestionnaires={questionnaires}
                                enTasks={tasks}
                                enResources={resources}
                                hour={time.hh}
                                minute={time.mm}
                                ampm={time.ampm}
                                timeZone={timeZone}
                                isLinked={isLinked}
                                meetingEnabled={meetingEnabled}
                                meetingLink={meetingLink}
                                meetingHour={meetingHour}
                                meetingMinute={meetingMinute}
                                meetingAmPm={meetingAmPm}
                                data={getLangTabData(lang.id)}
                                onChange={(updates) => updateLangTabData(lang.id, updates)}
                                refreshSignal={translationRefreshTick[lang.id]}
                                onDataLoaded={(loaded) => {
                                    langBaselineRef.current[lang.id] = loaded;
                                }}
                            />
                        );
                    })()}

                    {/* En tab content */}
                    {activeLangTab === 'en' && (
                    <>
                    <div className={styles.sectionTitle} style={{ color: '#EE4621' }}>Content Configuration</div>

                    <div className={styles.row}>
                        <div className={styles.col}>
                            <label className={styles.label}>
                                Link Content to Date & Time <span style={{ color: '#EE4621' }}>*</span>
                            </label>
                            <label className={styles.label} style={{ fontSize: '12px', color: '#6B7280', fontWeight: 400 }}>Restrict the access of this content on the app by a date & time</label>
                            <div className={styles.dateRow}>
                                <input
                                    type="date"
                                    className={styles.dateInput}
                                    value={date}
                                    onChange={e => { setDate(e.target.value); setValidationError(''); }}
                                    onClick={(e) => (e.target as any).showPicker?.()}
                                    style={!date ? { borderColor: validationError ? '#EE4621' : undefined } : {}}
                                />
                                <select
                                    className={styles.timeSelect}
                                    value={time.hh}
                                    onChange={e => { setTime({ ...time, hh: e.target.value }); setValidationError(''); }}
                                    style={(time.hh === 'hh' && validationError) ? { borderColor: '#EE4621' } : {}}
                                >
                                    <option value="hh">hh</option>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(h => <option key={h} value={h.toString().padStart(2, '0')}>{h}</option>)}
                                </select>
                                <select
                                    className={styles.timeSelect}
                                    value={time.mm}
                                    onChange={e => { setTime({ ...time, mm: e.target.value }); setValidationError(''); }}
                                    style={(time.mm === 'mm' && validationError) ? { borderColor: '#EE4621' } : {}}
                                >
                                    <option value="mm">mm</option>
                                    {['00', '15', '30', '45'].map(val => (
                                        <option key={val} value={val}>{val}</option>
                                    ))}
                                </select>
                                <select className={styles.timeSelect} value={time.ampm} onChange={e => setTime({ ...time, ampm: e.target.value })}>
                                    <option>AM</option>
                                    <option>PM</option>
                                </select>
                            </div>
                            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '6px' }}>
                                Timezone: <span style={{ color: 'var(--color-primary, #EE4621)' }}>{timeZone}</span>
                            </div>
                            {validationError && (
                                <div style={{ fontSize: '12px', color: '#EE4621', marginTop: '4px' }}>{validationError}</div>
                            )}
                        </div>
                        <div className={styles.col}>
                            <label className={styles.label}>Link to Previous Content</label>
                            <label className={styles.label} style={{ fontSize: '12px', color: '#6B7280', fontWeight: 400 }}>Participants must complete the previous content to unlock this one</label>
                            <div className={styles.toggleWrapper}>
                                <span className={styles.toggleLabel}>Not Linked</span>
                                <label className={styles.toggle} style={defaultLinked ? { cursor: 'not-allowed' } : undefined}>
                                    <input
                                        type="checkbox"
                                        checked={isLinked}
                                        disabled={defaultLinked}
                                        readOnly={defaultLinked}
                                        onChange={defaultLinked ? undefined : () => setIsLinked(!isLinked)}
                                    />
                                    <span className={styles.slider}></span>
                                </label>
                                <span className={styles.toggleLabel}>Linked</span>
                            </div>
                        </div>
                    </div>

                    <SharedContentForm
                        title={title}
                        setTitle={setTitle}
                        content={content}
                        setContent={setContent}
                        resources={resources}
                        setResources={setResources}
                        mediaItems={mediaItems}
                        setMediaItems={setMediaItems}
                        tasks={tasks}
                        setTasks={setTasks}
                        questionnaires={questionnaires}
                        setQuestionnaires={setQuestionnaires}
                        meetingEnabled={meetingEnabled}
                        setMeetingEnabled={setMeetingEnabled}
                        meetingLink={meetingLink}
                        setMeetingLink={setMeetingLink}
                        meetingHour={meetingHour}
                        setMeetingHour={setMeetingHour}
                        meetingMinute={meetingMinute}
                        setMeetingMinute={setMeetingMinute}
                        meetingAmPm={meetingAmPm}
                        setMeetingAmPm={setMeetingAmPm}
                        contentSectionActions={
                            <div className={formStyles.csvActions}>
                                <button
                                    type="button"
                                    className={formStyles.csvDownloadBtn}
                                    onClick={() => downloadContentUploadTemplate()}
                                >
                                    Download template
                                </button>
                                <button
                                    className={formStyles.uploadMediaBtn}
                                    type="button"
                                    onClick={handleUploadTemplateClick}
                                >
                                    Import content from CSV
                                </button>
                                <input
                                    ref={csvInputRef}
                                    type="file"
                                    hidden
                                    accept=".csv,text/csv"
                                    onChange={handleTemplateUpload}
                                />
                            </div>
                        }
                    />
                    </>
                    )}
                    </div>
                </div>

                {isTrial && (
                    <div className={styles.trialNotice}>
                        Content editing is not available in Trial mode
                    </div>
                )}
                <div className={styles.modalFooter}>
                    {canDeleteContent ? (
                        <span
                            className={styles.deleteLink}
                            onClick={isTrial ? undefined : () => setShowDeleteConfirm(true)}
                            style={isTrial ? { opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none' } : undefined}
                        >
                            Delete this Content
                        </span>
                    ) : <span />}
                    <div className={styles.rightButtons}>
                        {activeLangTab !== 'en' ? (
                            isLastTab ? (
                                <button
                                    className={`${styles.saveBtn} ${translatingLang === activeLangTab ? styles.btnLoading : ''}`}
                                    onClick={() => handleSaveTranslationAndClose(activeLangTab)}
                                    disabled={isTrial || !canDeleteContent || translatingLang === activeLangTab}
                                >
                                    {translatingLang === activeLangTab ? 'Saving...' : 'Save & Close'}
                                </button>
                            ) : (
                                <>
                                    {!canDeleteContent && (
                                        <span style={{ fontSize: '12px', color: '#6B7280', marginRight: '12px', alignSelf: 'center' }}>
                                            Save the English content first to add translations
                                        </span>
                                    )}
                                    <button
                                        className={styles.cancelBtn}
                                        onClick={handleClose}
                                        disabled={translatingLang === activeLangTab}
                                    >
                                        Close
                                    </button>
                                    <button
                                        className={`${styles.saveBtn} ${translatingLang === activeLangTab ? styles.btnLoading : ''}`}
                                        onClick={() => handleSaveTranslationAndNext(activeLangTab)}
                                        disabled={isTrial || !canDeleteContent || translatingLang === activeLangTab}
                                    >
                                        {translatingLang === activeLangTab ? 'Saving...' : 'Save & Next'}
                                    </button>
                                </>
                            )
                        ) : isLastTab ? (
                            <>
                                {validationError && (
                                    <span style={{ fontSize: '12px', color: '#EE4621', marginRight: '12px', alignSelf: 'center' }}>
                                        {validationError}
                                    </span>
                                )}
                                <button className={`${styles.saveBtn} ${isLoading ? styles.btnLoading : ''}`} onClick={handleSave} disabled={isLoading || isTrial}>
                                    {isLoading ? 'Saving...' : 'Save & Close'}
                                </button>
                            </>
                        ) : (
                            <>
                                {validationError && (
                                    <span style={{ fontSize: '12px', color: '#EE4621', marginRight: '12px', alignSelf: 'center' }}>
                                        {validationError}
                                    </span>
                                )}
                                <button className={styles.cancelBtn} onClick={handleClose} disabled={isLoading}>Close</button>
                                <button className={`${styles.saveBtn} ${isLoading ? styles.btnLoading : ''}`} onClick={handleSaveAndNext} disabled={isLoading || isTrial}>
                                    {isLoading ? 'Saving...' : 'Save & Next'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {showCloseConfirm && (
                <ConfirmCloseModal
                    onConfirm={() => {
                        setShowCloseConfirm(false);
                        onClose();
                    }}
                    onCancel={() => setShowCloseConfirm(false)}
                />
            )}

            {showDeleteConfirm && (
                <ConfirmCloseModal
                    title="Delete Content"
                    message="Are you sure you want to delete this content? This action cannot be undone."
                    confirmText="Delete"
                    cancelText="Cancel"
                    onConfirm={async () => {
                        setShowDeleteConfirm(false);
                        const contentId = initialData?.id ?? initialData?.content_id;
                        if (onDelete && contentId) {
                            onDelete(String(contentId));
                        } else if (contentId) {
                            try {
                                const response = await contentService.delete(String(contentId));
                                if (response.success) onClose();
                            } catch (e) { console.error(e); }
                        }
                    }}
                    onCancel={() => setShowDeleteConfirm(false)}
                />
            )}

            {pendingTabSwitch && (
                <ConfirmCloseModal
                    title="Unsaved Changes"
                    message="You have unsaved changes on this tab. Save them before switching, or discard and switch anyway?"
                    confirmText="Discard & Switch"
                    cancelText="Cancel"
                    extraActionText="Save Changes"
                    extraActionLoading={isSwitchSaving}
                    onConfirm={handleDiscardAndSwitch}
                    onCancel={() => setPendingTabSwitch(null)}
                    onExtraAction={handleSaveAndSwitchTab}
                />
            )}
        </div>,
        document.body
    );
}
