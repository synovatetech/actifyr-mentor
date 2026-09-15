'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from '@/styles/journey-learning.module.css';
import SharedContentForm, { useSharedContentForm } from '@/components/features/content/SharedContentForm';
import ConfirmCloseModal from '@/components/common/ConfirmCloseModal';

interface AddJourneyContentModalProps {
    onClose: () => void;
    onSave: (item: any) => void;
    onDelete?: (contentId: string) => void;
    itemNumber: number;
    initialData?: any;
    isLoading?: boolean;
}

export default function AddJourneyContentModal({ onClose, onSave, onDelete, itemNumber, initialData, isLoading }: AddJourneyContentModalProps) {
    const [isLinked, setIsLinked] = useState(true);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [validationError, setValidationError] = useState('');

    // Time/Date state - specific to Journey
    const [date, setDate] = useState('');
    const [time, setTime] = useState({ hh: 'hh', mm: 'mm', ampm: 'AM' });

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

    useEffect(() => {
        if (initialData) {
            // Journey content is always sequentially linked; this cannot be disabled.
            setIsLinked(true);

            // Parse date from API response
            if (initialData.date) {
                const d = new Date(initialData.date);
                if (!isNaN(d.getTime())) {
                    setDate(d.toISOString().split('T')[0]);
                } else {
                    // Try direct YYYY-MM-DD extraction
                    const match = String(initialData.date).match(/^\d{4}-\d{2}-\d{2}/);
                    if (match) setDate(match[0]);
                }
            }

            // Parse time from API response (handles "HH:MM AM/PM" and "HH:MM:SS" 24h formats)
            if (initialData.time) {
                const timeStr = String(initialData.time).trim();
                const ampmMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
                if (ampmMatch) {
                    setTime({ hh: ampmMatch[1], mm: ampmMatch[2], ampm: ampmMatch[3].toUpperCase() });
                } else {
                    // 24-hour format like "10:00:00" or "14:30"
                    const parts = timeStr.split(':');
                    let h = parseInt(parts[0], 10);
                    const m = parts[1] || '00';
                    let ampmVal = 'AM';
                    if (h >= 12) {
                        ampmVal = 'PM';
                        if (h > 12) h -= 12;
                    } else if (h === 0) {
                        h = 12;
                    }
                    setTime({ hh: h.toString(), mm: m, ampm: ampmVal });
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
            setMeetingEnabled(false);
            setMeetingLink('');
            setMeetingHour('10');
            setMeetingMinute('00');
            setMeetingAmPm('AM');
        }
        setValidationError('');
    }, [initialData]);

    const handleSave = () => {
        if (!title.trim()) {
            setValidationError('Title is required.');
            return;
        }
        if (date && (time.hh === 'hh' || time.mm === 'mm')) {
            setValidationError('Time is required.');
            return;
        }
        if (!date && (time.hh !== 'hh' || time.mm !== 'mm')) {
            setValidationError('Date is required.');
            return;
        }
        setValidationError('');

        const newItem = {
            id: initialData?.id || initialData?.content_id,
            index: initialData?.index || itemNumber,
            title: title,
            subtitle: `Proof of Action`,
            content: content,
            rating: initialData?.rating || null,
            ratingCount: initialData?.ratingCount || 0,
            unlockTime: date ? `${date}, ${time.hh}:${time.mm} ${time.ampm}` : (initialData?.unlock_date || 'Access Anytime'),
            date: date || initialData?.date,
            time: (time.hh !== 'hh') ? `${time.hh}:${time.mm} ${time.ampm}` : initialData?.time,
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

            inclusions: {
                audio: mediaItems.filter(m => m.type === 'audio').length,
                video: mediaItems.filter(m => m.type === 'video').length,
                questions: questionnaires.length,
                tasks: tasks.length
            }
        };
        onSave(newItem);
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
                    <div className={styles.closeIcon} onClick={handleClose}>✕</div>
                </div>

                <div className={styles.modalBody}>
                    {isLoading && (
                        <div className={styles.loadingOverlay}>
                            <div className={styles.spinner}></div>
                            <span>Please wait... Saving your content</span>
                        </div>
                    )}
                    {/* Configuration Section */}
                    <div className={styles.modalSection}>
                        <div className={styles.sectionTitle}>Content Configuration</div>
                        <div className={styles.row}>
                            <div className={styles.col}>
                                <label className={styles.label}>Link Content to Date & Time</label>
                                <div className={styles.dateRow}>
                                    <input
                                        type="date"
                                        className={styles.dateInput}
                                        value={date}
                                        onChange={(e) => { setDate(e.target.value); setValidationError(''); }}
                                        onClick={(e) => (e.target as any).showPicker?.()}
                                        style={!date && validationError ? { borderColor: '#EE4621' } : {}}
                                    />
                                    <select
                                        className={styles.timeSelect}
                                        value={time.hh}
                                        onChange={e => { setTime({ ...time, hh: e.target.value }); setValidationError(''); }}
                                        style={time.hh === 'hh' && !!validationError ? { borderColor: '#EE4621' } : {}}
                                    >
                                        <option value="hh">hh</option>
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(h => <option key={h} value={h.toString().padStart(2, '0')}>{h}</option>)}
                                    </select>
                                    <select
                                        className={styles.timeSelect}
                                        value={time.mm}
                                        onChange={e => { setTime({ ...time, mm: e.target.value }); setValidationError(''); }}
                                        style={time.mm === 'mm' && !!validationError ? { borderColor: '#EE4621' } : {}}
                                    >
                                        <option value="mm">mm</option>
                                        {['00', '15', '30', '45'].map(val => (
                                            <option key={val} value={val}>{val}</option>
                                        ))}
                                    </select>
                                    <select className={styles.timeSelect} value={time.ampm} onChange={e => { setTime({ ...time, ampm: e.target.value }); setValidationError(''); }}>
                                        <option>AM</option>
                                        <option>PM</option>
                                    </select>
                                </div>
                                {validationError && (
                                    <div style={{ fontSize: '12px', color: '#EE4621', marginTop: '4px' }}>{validationError}</div>
                                )}
                            </div>
                            <div className={styles.col}>
                                <label className={styles.label}>Link to Previous Content (Cannot be disabled)</label>
                                <div className={styles.toggleWrapper}>
                                    <label className={styles.toggle} style={{ cursor: 'not-allowed' }}>
                                        <input type="checkbox" checked={isLinked} disabled readOnly />
                                        <span className={styles.slider}></span>
                                    </label>
                                    <span className={styles.toggleLabel}>Linked</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Shared Content Form - Replaces Title/Content inputs */}
                    <div className={styles.modalSection}>
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
                        />
                    </div>
                </div>

                <div className={styles.modalFooter}>
                    {onDelete && initialData?.id ? (
                        <span
                            className={styles.deleteLink}
                            onClick={() => setShowDeleteConfirm(true)}
                        >
                            Delete this Content
                        </span>
                    ) : (
                        <span />
                    )}
                    <div className={styles.rightButtons}>
                        {validationError && (
                            <span style={{ fontSize: '12px', color: '#EE4621', marginRight: '12px', alignSelf: 'center' }}>
                                {validationError}
                            </span>
                        )}
                        <button className={styles.cancelBtn} onClick={handleClose} disabled={isLoading}>Close</button>
                        <button className={`${styles.saveBtn} ${isLoading ? styles.btnLoading : ''}`} onClick={handleSave} disabled={isLoading}>
                            {isLoading ? 'Saving...' : 'Save Content'}
                        </button>
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
                    onConfirm={() => {
                        setShowDeleteConfirm(false);
                        if (onDelete && initialData?.id) {
                            onDelete(String(initialData.id));
                        }
                    }}
                    onCancel={() => setShowDeleteConfirm(false)}
                />
            )}
        </div>,
        document.body
    );
}
