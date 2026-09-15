"use client";

import { useState, useRef, useEffect, type ChangeEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import styles from "@/styles/add-content-modal.module.css";
import langStyles from "@/styles/lang-content-tab.module.css";
import RichTextEditor from "@/components/common/RichTextEditor";
import QuestionModal from "./QuestionModal";
import TaskModal from "./TaskModal";
import MediaPreviewModal from "./MediaPreviewModal";
import type { Resource, Task, Questionnaire, MediaItem } from "./SharedContentForm";
import { useToast } from "@/context/ToastContext";
import { contentService } from "@/services/api/content.service";
import {
  downloadContentUploadTemplate,
  parseContentUploadTemplate,
} from "@/utils/content-upload-template";
import {
  getMediaDurationInSeconds,
  validateMediaFileSize,
  MIN_MEDIA_DURATION_SECONDS,
  MEDIA_DURATION_ERROR_MESSAGE,
  normalizeContentData,
} from "@/utils/content-helper";

export interface LangTabData {
  title: string;
  content: string;
  mediaItems: MediaItem[];
  questionnaires: Questionnaire[];
  taskDescriptions: string[];
  resourceLabels?: string[];
}

interface LanguageContentTabProps {
  langId: string;
  langName: string;
  programId?: string | number;
  contentId?: string | number;
  // En tab data (for slot counts + read-only resource mirror)
  enMediaItems: MediaItem[];
  enQuestionnaires: Questionnaire[];
  enTasks: Task[];
  enResources: Resource[];
  // Content Configuration values (read-only display)
  hour: string;
  minute: string;
  ampm: string;
  timeZone: string;
  isLinked: boolean;
  // Virtual Meeting values (read-only display)
  meetingEnabled: boolean;
  meetingLink: string;
  meetingHour: string;
  meetingMinute: string;
  meetingAmPm: string;
  // This lang's mutable state
  data: LangTabData;
  onChange: (updates: Partial<LangTabData>) => void;
  /** Bumped by the parent right after a successful translation save, so the
   *  just-persisted data re-applies over local state (resolving real ids for
   *  newly created media/tasks/questions) instead of staying stale forever. */
  refreshSignal?: number;
  /** Called once, right after the fetched translation is first applied — lets the
   *  parent snapshot this language's "last saved" baseline for dirty checks. */
  onDataLoaded?: (loaded: Partial<LangTabData>) => void;
}

export default function LanguageContentTab({
  langId,
  langName,
  programId,
  contentId,
  enMediaItems,
  enQuestionnaires,
  enTasks,
  enResources,
  hour,
  minute,
  ampm,
  timeZone,
  isLinked,
  meetingEnabled,
  meetingLink,
  meetingHour,
  meetingMinute,
  meetingAmPm,
  data,
  onChange,
  refreshSignal,
  onDataLoaded,
}: LanguageContentTabProps) {
  const { showToast } = useToast();

  // Fetches this language's existing translation via the same content-detail
  // endpoint as English, passing language_code so the API returns translated
  // text/media/questionnaires/tasks/resources instead of the English version.
  const { data: fetchedTranslation, isFetching: isLoadingTranslation } = useQuery({
    queryKey: ["lang-content", langId, programId, contentId],
    queryFn: async () => {
      const res = await contentService.getById(contentId!, programId!, langId);
      if (!res.success) throw new Error(res.error || "Failed to load translation");
      return res.data;
    },
    enabled: !!contentId && !!programId,
    staleTime: 60 * 1000,
  });

  // Populates the tab from the fetched translation exactly once per (lang, content) —
  // a background refetch shouldn't clobber edits the admin has already started typing.
  // A deliberate save bumps refreshSignal, which clears that guard so the
  // just-persisted (backend-confirmed) data re-applies on its next fetch.
  const appliedTranslationKeysRef = useRef<Set<string>>(new Set());
  const lastRefreshSignalRef = useRef(refreshSignal);
  useEffect(() => {
    if (refreshSignal === undefined || refreshSignal === lastRefreshSignalRef.current) return;
    lastRefreshSignalRef.current = refreshSignal;
    appliedTranslationKeysRef.current.delete(`${langId}:${contentId}`);
  }, [refreshSignal, langId, contentId]);

  useEffect(() => {
    if (!fetchedTranslation) return;
    const key = `${langId}:${contentId}`;
    if (appliedTranslationKeysRef.current.has(key)) return;
    appliedTranslationKeysRef.current.add(key);

    const normalized = normalizeContentData(fetchedTranslation);
    if (!normalized) return;
    const loaded: Partial<LangTabData> = {
      title: normalized.title || fetchedTranslation.title || "",
      content: normalized.content || fetchedTranslation.content_text || "",
      mediaItems: normalized.mediaItems || [],
      questionnaires: normalized.questionnaires || [],
      taskDescriptions: (normalized.tasks || []).map((t: any) => t.description || ""),
      resourceLabels: (normalized.resources || []).map((r: any) => r.label || ""),
    };
    onChange(loaded);
    onDataLoaded?.(loaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchedTranslation, langId, contentId]);

  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [editingQuestionIdx, setEditingQuestionIdx] = useState<number | null>(null);
  const [tempQuestion, setTempQuestion] = useState<Partial<Questionnaire>>({});
  const [activeQuestionDropdown, setActiveQuestionDropdown] = useState<string | null>(null);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [previewMediaItem, setPreviewMediaItem] = useState<MediaItem | null>(null);
  const [editingTaskSlotIdx, setEditingTaskSlotIdx] = useState<number | null>(null);

  const mediaInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const handleUploadTemplateClick = () => {
    csvInputRef.current?.click();
  };

  const handleTemplateUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const csvText = await file.text();
      const parsed = parseContentUploadTemplate(csvText);
      const taskDescriptions = enTasks.map(
        (_, i) => parsed.tasks[i]?.description || data.taskDescriptions[i] || "",
      );
      onChange({
        title: parsed.title,
        content: parsed.content,
        questionnaires: parsed.questionnaires,
        taskDescriptions,
      });
      showToast(
        `Template imported successfully. Loaded ${parsed.questionnaires.length} question(s) and ${parsed.tasks.length} task(s).`,
        "success",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to import this CSV file. Please check the template format.";
      showToast(message, "error");
    } finally {
      event.target.value = "";
    }
  };

  const handleMediaSlotClick = (slotIdx: number) => {
    mediaInputRefs.current[slotIdx]?.click();
  };

  const handleMediaSlotChange = async (
    slotIdx: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeError = validateMediaFileSize(file);
    if (sizeError) {
      showToast(sizeError, "error");
      e.target.value = "";
      return;
    }

    const duration = await getMediaDurationInSeconds(file);
    if (duration > 0 && duration < MIN_MEDIA_DURATION_SECONDS) {
      showToast(MEDIA_DURATION_ERROR_MESSAGE, "error");
      e.target.value = "";
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const newItem: MediaItem = {
      id: Math.random().toString(36).substr(2, 9),
      file,
      previewUrl,
      type: file.type.startsWith("video") ? "video" : "audio",
      duration,
    };
    const updated = [...data.mediaItems];
    if (slotIdx < updated.length) {
      updated[slotIdx] = newItem;
    } else {
      while (updated.length < slotIdx) updated.push(newItem);
      updated.push(newItem);
    }
    onChange({ mediaItems: updated });
    e.target.value = "";
  };

  const openAddQuestion = (idx: number) => {
    setTempQuestion({
      id: Math.random().toString(36).substr(2, 9),
      question: "",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      // The correct answer always mirrors the English question and isn't chosen per language.
      right_answer: enQuestionnaires[idx]?.right_answer || "",
    });
    setEditingQuestionIdx(idx);
    setIsAddingQuestion(true);
  };

  const openEditQuestion = (q: Questionnaire, idx: number) => {
    setTempQuestion({ ...q });
    setEditingQuestionIdx(idx);
    setIsAddingQuestion(true);
    setExpandedQuestionId(null);
  };

  const saveQuestion = (qData: Questionnaire) => {
    const updated = [...data.questionnaires];
    if (editingQuestionIdx !== null && editingQuestionIdx < updated.length) {
      updated[editingQuestionIdx] = qData;
    } else {
      updated.push(qData);
    }
    onChange({ questionnaires: updated });
    setIsAddingQuestion(false);
    setEditingQuestionIdx(null);
    setTempQuestion({});
  };

  return (
    <div>
      {isLoadingTranslation && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, color: "var(--color-text-secondary)", fontSize: 13 }}>
          <span className={styles.spinner} style={{ width: 14, height: 14, borderWidth: 2 }}></span>
          Loading {langName} translation...
        </div>
      )}
      {/* Content Configuration — READ ONLY */}
      <div className={styles.contentConfigHeaderRow}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className={styles.sectionTitle} style={{ marginBottom: 0 }}>Content Configuration</div>
          <span className={langStyles.readOnlyBadge}>Read Only</span>
        </div>
      </div>
      <div className={`${styles.configRow} ${langStyles.readOnlySection}`}>
        <div className={styles.configCol}>
          <div className={styles.inputLabel}>Content Available From</div>
          <div className={styles.sectionDescription}>
            Set the time when the content becomes available to participants on the app
          </div>
          <div className={styles.timeInputs}>
            <select className={`${styles.selectInput} ${langStyles.readOnlyField}`} value={hour} disabled>
              {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => (
                <option key={h} value={h}>{h.toString().padStart(2, "0")}</option>
              ))}
            </select>
            <select className={`${styles.selectInput} ${langStyles.readOnlyField}`} value={minute} disabled>
              {["00", "15", "30", "45"].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <select className={`${styles.selectInput} ${langStyles.readOnlyField}`} value={ampm} disabled>
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
          <div className={styles.sectionDescription} style={{ paddingTop: "6px" }}>
            Timezone:{" "}
            <span style={{ color: "var(--color-primary)" }}>{timeZone}</span>
          </div>
        </div>
        <div className={styles.configCol}>
          <div className={styles.inputLabel}>Link to Previous Content</div>
          <div className={styles.sectionDescription}>
            Participants must complete the previous content to unlock this one
          </div>
          <div className={styles.toggleContainer}>
            <span>Not Linked</span>
            <div
              className={`${styles.toggleSwitch} ${isLinked ? styles.active : ""}`}
              style={{ pointerEvents: "none" }}
            >
              <div className={styles.toggleKnob}></div>
            </div>
            <span>Linked</span>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className={styles.sectionHeader} style={{ marginBottom: "16px" }}>
        <div className={styles.sectionTitle} style={{ marginBottom: 0 }}>
          Content Section
        </div>
        <div className={styles.csvActions}>
          <button
            type="button"
            className={styles.csvDownloadBtn}
            onClick={() => downloadContentUploadTemplate()}
          >
            Download template
          </button>
          <button
            className={styles.uploadMediaBtn}
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
      </div>

      <div className={styles.inputGroup} style={{ marginBottom: "24px" }}>
        <label className={styles.inputLabel}>
          Title<span>*</span>
        </label>
        <input
          className={styles.textInput}
          placeholder={`Enter the content title in ${langName}`}
          value={data.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </div>

      <div className={styles.inputGroup} style={{ marginBottom: "24px" }}>
        <label className={styles.inputLabel}>
          Content<span>*</span>
        </label>
        <RichTextEditor
          content={data.content}
          onChange={(val) => onChange({ content: val })}
          showColorPicker={true}
          placeholder={`Enter your content here in ${langName}`}
        />
      </div>

      {/* Additional Resources — only shown when English has real resources (non-empty value or label) */}
      {enResources.some((r) => (r.value && r.value.trim()) || (r.label && r.label.trim())) && (
        <>
          <div className={styles.sectionHeader} style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label className={styles.inputLabel} style={{ marginBottom: 0 }}>
                Additional Resources{" "}
                <span style={{ fontWeight: 400, color: "var(--color-text-secondary)" }}>
                  [Add multiple files and URLs]
                </span>
              </label>
              <span className={langStyles.readOnlyBadge}>Read Only</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
            {enResources.filter((r) => (r.value && r.value.trim()) || (r.label && r.label.trim())).map((res, index) => (
              <div key={index} className={styles.resourceCard}>
                <div className={`${styles.resourceMainRow} ${langStyles.readOnlySection}`}>
                  <div className={styles.resourceTypeDropdownWrapper}>
                    <select className={`${styles.resourceTypeSelect} ${langStyles.readOnlyField}`} value={res.type} disabled>
                      <option value="file">Add File</option>
                      <option value="url">Add URL</option>
                    </select>
                  </div>
                  <div className={styles.resourceValueInputArea}>
                    <input
                      className={`${styles.resourceURLInput} ${langStyles.readOnlyField}`}
                      value={res.value || ""}
                      readOnly
                    />
                  </div>
                </div>
                <div className={styles.resourceOptionsRow}>
                  <div className={styles.resourceLabelInputWrapper}>
                    <input
                      className={styles.resourceLabelInput}
                      placeholder={`Resource Title in ${langName}`}
                      value={data.resourceLabels?.[index] ?? res.label ?? ""}
                      onChange={(e) => {
                        const updated = [...(data.resourceLabels || enResources.map((r) => r.label || ""))];
                        updated[index] = e.target.value;
                        onChange({ resourceLabels: updated });
                      }}
                    />
                  </div>
                  <div className={`${styles.resourceFlags} ${langStyles.readOnlySection}`}>
                    <label className={styles.resourceCheckboxLabel}>
                      <input
                        type="checkbox"
                        className={styles.orangeCheckbox}
                        checked={!!res.addToResourcesPage}
                        readOnly
                        style={{ pointerEvents: "none" }}
                      />
                      Add to Resources Page
                      <span className={styles.infoCircle}>i</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Audio or Video — N upload slots matching En count */}
      <div className={styles.sectionHeader} style={{ marginBottom: "16px" }}>
        <div className={styles.sectionTitle} style={{ marginBottom: 0 }}>
          Audio or Video
        </div>
      </div>
      {enMediaItems.length === 0 ? (
        <div className={langStyles.emptySlot} style={{ marginBottom: 24 }}>
          <span style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>
            No media files added in English
          </span>
        </div>
      ) : (
        <div className={styles.mediaGrid} style={{ marginBottom: 24 }}>
          {enMediaItems.map((enItem, slotIdx) => {
            const entry = data.mediaItems[slotIdx];
            const uploaded = entry && (entry.file || (entry.previewUrl && entry.previewUrl.trim())) ? entry : null;
            return (
              <div key={slotIdx}>
                {uploaded ? (
                  <div className={styles.mediaItemContainer}>
                    <div
                      className={styles.mediaCard}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewMediaItem(uploaded);
                      }}
                      title="Click to play"
                    >
                      <div className={styles.mediaThumbnailPlaceholder}>
                        <div className={styles.playIconCircle}>
                          {uploaded.type === "video" ? "▶" : "🎵"}
                        </div>
                      </div>
                      <button
                        className={styles.removeMediaBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          const updated = [...data.mediaItems];
                          updated.splice(slotIdx, 1);
                          onChange({ mediaItems: updated });
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={langStyles.mediaSlot}
                    onClick={() => handleMediaSlotClick(slotIdx)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--color-primary)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span className={langStyles.mediaSlotLabel}>
                      Upload Media {slotIdx + 1}
                    </span>
                    <span className={langStyles.mediaSlotSub}>
                      {enItem.type === "audio" ? "Audio" : "Video"} file
                    </span>
                  </div>
                )}
                <input
                  ref={(el) => { mediaInputRefs.current[slotIdx] = el; }}
                  type="file"
                  hidden
                  accept="video/*,audio/*"
                  onChange={(e) => handleMediaSlotChange(slotIdx, e)}
                />
              </div>
            );
          })}
        </div>
      )}

      <MediaPreviewModal
        item={previewMediaItem}
        onClose={() => setPreviewMediaItem(null)}
      />

      {/* Assessment — N placeholder cards matching En question count */}
      <div style={{ height: 8 }} />
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle} style={{ marginBottom: 0 }}>
          Assessment
        </div>
      </div>

      <QuestionModal
        isOpen={isAddingQuestion}
        onClose={() => {
          setIsAddingQuestion(false);
          setEditingQuestionIdx(null);
          setTempQuestion({});
        }}
        onSave={saveQuestion}
        initialData={isAddingQuestion ? (tempQuestion as Questionnaire) : null}
        itemNumber={(editingQuestionIdx !== null && editingQuestionIdx < data.questionnaires.length)
          ? editingQuestionIdx + 1
          : data.questionnaires.length + 1}
        lockCorrectAnswer
      />

      {enQuestionnaires.length === 0 ? (
        <div className={langStyles.emptySlot} style={{ marginBottom: 24 }}>
          <span style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>
            No questions added in English
          </span>
        </div>
      ) : (
        <div style={{ marginBottom: 24 }}>
          {enQuestionnaires.map((_, slotIdx) => {
            const entry = data.questionnaires[slotIdx];
            const filled = entry && entry.question && entry.question.trim() ? entry : null;
            return (
              <div key={slotIdx}>
                {filled ? (
                  <div
                    className={expandedQuestionId === filled.id ? styles.questionItemActive : styles.questionItem}
                  >
                    <div
                      className={styles.questionHeader}
                      onClick={() =>
                        setExpandedQuestionId(expandedQuestionId === filled.id ? null : filled.id)
                      }
                    >
                      <div className={styles.questionTitle}>
                        <span>Q{slotIdx + 1}</span>
                        <span
                          style={{ overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
                          className="tiptap-rendered-content"
                          dangerouslySetInnerHTML={{ __html: filled.question }}
                        />
                      </div>
                      <div className={styles.questionActions}>
                        <div
                          className={styles.emptySquareBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveQuestionDropdown(activeQuestionDropdown === filled.id ? null : filled.id);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
                          </svg>
                        </div>
                        {activeQuestionDropdown === filled.id && (
                          <>
                            <div style={{ position: "fixed", inset: 0, zIndex: 9 }} onClick={(e) => { e.stopPropagation(); setActiveQuestionDropdown(null); }} />
                            <div className={styles.taskMenuDropdown} style={{ top: "38px", right: "40px" }}>
                              <button className={styles.taskMenuItem} onClick={(e) => { e.stopPropagation(); setActiveQuestionDropdown(null); openEditQuestion(filled, slotIdx); }}>Edit</button>
                            </div>
                          </>
                        )}
                        <div className={styles.chevronIcon}>
                          {expandedQuestionId === filled.id ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                          )}
                        </div>
                      </div>
                    </div>
                    {expandedQuestionId === filled.id && (
                      <div className={styles.questionBody}>
                        {(["A", "B", "C", "D"] as const).map((opt) => (
                          <div key={opt} className={styles.optionRow}>
                            {filled.right_answer === opt ? (
                              <div className={styles.correctCheckIcon}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                              </div>
                            ) : (
                              <div className={styles.emptySpaceCircle} />
                            )}
                            <span className={filled.right_answer === opt ? styles.correctOption : ""}>
                              {(filled as any)[`option_${opt.toLowerCase()}`]}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={langStyles.placeholderCard} onClick={() => openAddQuestion(slotIdx)}>
                    <div className={langStyles.placeholderNumber}>Q{slotIdx + 1}</div>
                    <div className={langStyles.placeholderText}>Click to add Question {slotIdx + 1}</div>
                    <button className={styles.actionBtn} style={{ fontSize: 13, padding: "8px 20px", height: "auto" }}>
                      Add Question
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ height: 24 }} />

      {/* Tasks — mirror English tasks; only description is editable per language */}
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle} style={{ marginBottom: 0 }}>
          Tasks
        </div>
      </div>

      {enTasks.length === 0 ? (
        <div className={langStyles.emptySlot} style={{ marginBottom: 24 }}>
          <span style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>
            No tasks added in English
          </span>
        </div>
      ) : (
        <div className={styles.taskList} style={{ marginBottom: 24 }}>
          {enTasks.map((enTask, slotIdx) => {
            const typeRaw = (enTask.category || enTask.type || "").toLowerCase();
            const typeLabel = typeRaw.includes("pow") ? "PoW"
              : typeRaw.includes("poi") ? "PoI"
              : typeRaw.includes("poa") ? "PoA"
              : "General";
            const description = data.taskDescriptions[slotIdx];
            return (
              <div key={slotIdx} className={styles.taskCard}>
                <div className={`${styles.taskHeader} ${langStyles.readOnlySection}`}>
                  <span className={styles.taskTitle}>
                    Task {slotIdx + 1} <span>({typeLabel})</span>
                  </span>
                  <span className={styles.taskPoints}>{enTask.point} Points</span>
                </div>
                {description ? (
                  <div
                    className={langStyles.placeholderCard}
                    onClick={() => setEditingTaskSlotIdx(slotIdx)}
                    style={{ cursor: "pointer", textAlign: "left", alignItems: "flex-start" }}
                  >
                    <div
                      className="tiptap-rendered-content"
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                      }}
                      dangerouslySetInnerHTML={{ __html: description }}
                    />
                  </div>
                ) : (
                  <div className={langStyles.placeholderCard} onClick={() => setEditingTaskSlotIdx(slotIdx)}>
                    <div className={langStyles.placeholderText}>
                      Click to add task description in {langName}
                    </div>
                    <button className={styles.actionBtn} style={{ fontSize: 13, padding: "8px 20px", height: "auto" }}>
                      Add Description
                    </button>
                  </div>
                )}
                <div className={`${styles.taskFooter} ${langStyles.readOnlySection}`}>
                  <div className={styles.badgeRow}>
                    {enTask.action && enTask.action.length > 0
                      ? enTask.action.map((act, i) => (
                          <span key={i} className={styles.taskActionBadge}>{act}</span>
                        ))
                      : <span className={styles.taskNoAction}>No micro-actions added</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TaskModal
        isOpen={editingTaskSlotIdx !== null}
        onClose={() => setEditingTaskSlotIdx(null)}
        onSave={(taskData) => {
          if (editingTaskSlotIdx === null) return;
          const updatedDescriptions = [...(data.taskDescriptions.length > 0
            ? data.taskDescriptions
            : enTasks.map(() => ""))];
          updatedDescriptions[editingTaskSlotIdx] = taskData.description;
          onChange({ taskDescriptions: updatedDescriptions });
          setEditingTaskSlotIdx(null);
        }}
        initialData={editingTaskSlotIdx !== null ? {
          description: data.taskDescriptions[editingTaskSlotIdx] || "",
        } : null}
        itemNumber={(editingTaskSlotIdx ?? 0) + 1}
        descriptionOnly
        headerTitle={editingTaskSlotIdx !== null ? `Task ${editingTaskSlotIdx + 1} — ${langName}` : undefined}
      />

      <div style={{ height: 24 }} />

      {/* Virtual Meeting — READ ONLY */}
      <div className={styles.virtualMeetingSection}>
        <div className={styles.sectionHeader} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className={styles.sectionTitle} style={{ marginBottom: 0 }}>
              Virtual Meeting
            </div>
            <span className={langStyles.readOnlyBadge}>Read Only</span>
          </div>
        </div>
        <div className={`${styles.virtualMeetingCard} ${langStyles.readOnlySection}`}>
          <div className={styles.virtualMeetingToggleRow}>
            <div
              className={`${styles.toggleSwitch} ${meetingEnabled ? styles.active : ""}`}
              style={{ pointerEvents: "none" }}
            >
              <div className={styles.toggleKnob}></div>
            </div>
            <span className={styles.virtualMeetingToggleLabel}>
              Add Virtual Meeting
              <span className="font-normal"> for this day</span>
            </span>
          </div>
          <div className={styles.virtualMeetingDescription}>
            Enable this option to schedule a virtual meeting for this content.
            The meeting link configured during program setup will be used
            automatically - you only need to set the meeting time
          </div>
          <input
            className={`${styles.virtualMeetingLinkInput} ${langStyles.readOnlyField}`}
            placeholder="https://meet.google.com/..."
            value={meetingLink}
            readOnly
          />
          <div className={styles.virtualMeetingTimeRow}>
            <select className={`${styles.selectInput} ${langStyles.readOnlyField}`} value={meetingHour} disabled>
              {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => (
                <option key={h} value={h.toString().padStart(2, "0")}>
                  {h.toString().padStart(2, "0")}
                </option>
              ))}
            </select>
            <select className={`${styles.selectInput} ${langStyles.readOnlyField}`} value={meetingMinute} disabled>
              {["00", "15", "30", "45"].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <select className={`${styles.selectInput} ${langStyles.readOnlyField}`} value={meetingAmPm} disabled>
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
