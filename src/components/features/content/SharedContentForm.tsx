"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import styles from "@/styles/add-content-modal.module.css";
import RichTextEditor from "@/components/common/RichTextEditor";
import {
  normalizeContentData,
  getMediaDurationInSeconds,
  validateMediaFileSize,
  MIN_MEDIA_DURATION_SECONDS,
  MEDIA_DURATION_ERROR_MESSAGE,
} from "@/utils/content-helper";
import { useToast } from "@/context/ToastContext";
import QuestionModal from "./QuestionModal";
import TaskModal from "./TaskModal";
import MediaPreviewModal from "@/components/features/content/MediaPreviewModal";
import type { MediaItem } from "./content.types";
import { isValidMicroAction } from "@/utils/task-options";

/** AI-generated audio/video row (e.g. after Tavus/Mux status `ready`). */
export type GeneratedMediaEntry = {
  url: string;
  type: "video" | "audio";
  title?: string;
  /** JPEG data URL or remote poster from capture util. */
  thumbnailUrl?: string;
  /** Prefer for `<video src>`: MP4/HLS; falls back to `url`. */
  playbackUrl?: string;
};

export interface Resource {
  type: "url" | "file";
  label: string;
  value: string;
  file?: File;
  /** Persisted hint from API; payload `resource_from` is derived from `addToResourcesPage` in createContentFormData */
  resource_from?: "content" | "both" | "direct";
  is_downloadable: boolean;
  addToResourcesPage?: boolean;
}

export interface Task {
  id: string;
  type: "PoW" | "general" | "PoA" | "PoI";
  category?: string;
  indexOnCompletion?: string;
  title: string;
  description: string;
  action: string[];
  point: number | "";
  file?: File;
  /** Already-uploaded attachment's resolved URL, present once persisted (no new `file` selected). */
  existingAttachmentUrl?: string;
  /** API component-item id once this task has been persisted; absent for unsaved tasks. Content Builder only — ignored by the legacy AI flow. */
  serverId?: number;
}

export interface Questionnaire {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  right_answer: string;
}

export type { MediaItem } from "./content.types";

export const useSharedContentForm = (initialData?: any) => {
  const data = initialData ? normalizeContentData(initialData) : null;

  const [title, setTitle] = useState(data?.title || "");
  const [content, setContent] = useState(data?.content || "");
  const [resources, setResources] = useState<Resource[]>(data?.resources || []);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(
    data?.mediaItems || [],
  );
  const [tasks, setTasks] = useState<Task[]>(data?.tasks || []);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>(
    data?.questionnaires || [],
  );

  // Re-sync state when initialData changes (e.g., API response arrives after modal opens)
  useEffect(() => {
    if (initialData) {
      const normalized = normalizeContentData(initialData);
      if (normalized) {
        setTitle(normalized.title || "");
        setContent(normalized.content || "");
        setResources(normalized.resources || []);
        setMediaItems(normalized.mediaItems || []);
        setTasks(normalized.tasks || []);
        setQuestionnaires(normalized.questionnaires || []);
      }
    } else {
      // Reset for new content
      setTitle("");
      setContent("");
      setResources([]);
      setMediaItems([]);
      setTasks([]);
      setQuestionnaires([]);
    }
  }, [initialData]);

  return {
    title,
    setTitle,
    content,
    setContent,
    resources,
    setResources,
    mediaItems,
    setMediaItems,
    tasks,
    setTasks,
    questionnaires,
    setQuestionnaires,
  };
};

interface SharedContentFormProps {
  title: string;
  setTitle: (val: string) => void;
  content: string;
  setContent: (val: string) => void;
  resources: Resource[];
  setResources: (val: Resource[]) => void;
  mediaItems: MediaItem[];
  setMediaItems: (val: MediaItem[]) => void;
  tasks: Task[];
  setTasks: (val: Task[]) => void;
  questionnaires: Questionnaire[];
  setQuestionnaires: (val: Questionnaire[]) => void;
  isPastDate?: boolean;
  videoScript?: string;
  onDeleteScript?: () => void;
  isAI?: boolean;
  onReviewScript?: () => void;
  generatedMedia?: GeneratedMediaEntry[];
  isGeneratingVideo?: boolean;
  meetingEnabled?: boolean;
  setMeetingEnabled?: (val: boolean) => void;
  meetingLink?: string;
  setMeetingLink?: (val: string) => void;
  meetingHour?: string;
  setMeetingHour?: (val: string) => void;
  meetingMinute?: string;
  setMeetingMinute?: (val: string) => void;
  meetingAmPm?: string;
  setMeetingAmPm?: (val: string) => void;
  contentSectionActions?: ReactNode;
}

export default function SharedContentForm({
  title,
  setTitle,
  content,
  setContent,
  resources,
  setResources,
  mediaItems,
  setMediaItems,
  tasks,
  setTasks,
  questionnaires,
  setQuestionnaires,
  isPastDate = false,
  videoScript,
  onDeleteScript,
  isAI = false,
  onReviewScript,
  generatedMedia,
  isGeneratingVideo = false,
  meetingEnabled = false,
  setMeetingEnabled,
  meetingLink = "",
  setMeetingLink,
  meetingHour = "10",
  setMeetingHour,
  meetingMinute = "00",
  setMeetingMinute,
  meetingAmPm = "AM",
  setMeetingAmPm,
  contentSectionActions,
}: SharedContentFormProps) {
  const hasGeneratedVideo = Boolean(
    generatedMedia?.some((media) => media.type === "video"),
  );
  const { showToast } = useToast();
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(
    null,
  );
  const [activeTaskDropdown, setActiveTaskDropdown] = useState<string | null>(
    null,
  );
  const [activeQuestionDropdown, setActiveQuestionDropdown] = useState<
    string | null
  >(null);
  const [previewMediaItem, setPreviewMediaItem] = useState<MediaItem | null>(
    null,
  );

  // Editing State
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [tempTask, setTempTask] = useState<Partial<Task>>({});

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
    null,
  );
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [tempQuestion, setTempQuestion] = useState<Partial<Questionnaire>>({});

  // --- Task Handlers ---

  const startAddTask = () => {
    setTempTask({
      id: Math.random().toString(36).substr(2, 9),
      type: "general",
      title: "",
      description: "",
      point: 5,
      action: [],
    });
    setIsAddingTask(true);
    setEditingTaskId(null);
  };

  const startEditTask = (task: Task) => {
    setTempTask({ ...task });
    setEditingTaskId(task.id);
    setIsAddingTask(false);
  };

  const saveTask = (taskData: Task) => {
    if (editingTaskId) {
      setTasks(tasks.map((t) => (t.id === editingTaskId ? taskData : t)));
    } else {
      setTasks([...tasks, taskData]);
    }
    cancelTaskEdit();
  };

  const cancelTaskEdit = () => {
    setIsAddingTask(false);
    setEditingTaskId(null);
    setTempTask({});
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };

  const toggleTaskAction = (action: string) => {
    const currentActions = tempTask.action || [];
    if (currentActions.includes(action)) {
      setTempTask({
        ...tempTask,
        action: currentActions.filter((a) => a !== action),
      });
    } else {
      setTempTask({ ...tempTask, action: [...currentActions, action] });
    }
  };

  useEffect(() => {
    if (resources.length === 0) {
      setResources([
        {
          type: "file",
          label: "",
          value: "",
          resource_from: "content",
          is_downloadable: false,
          addToResourcesPage: false,
        },
      ]);
    }
  }, [resources.length, setResources]);

  // --- Question Handlers ---

  const startAddQuestion = () => {
    setTempQuestion({
      id: Math.random().toString(36).substr(2, 9),
      question: "",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      right_answer: "",
    });
    setIsAddingQuestion(true);
    setEditingQuestionId(null);
  };

  const startEditQuestion = (q: Questionnaire) => {
    setTempQuestion({ ...q });
    setEditingQuestionId(q.id);
    setIsAddingQuestion(false);
    setExpandedQuestionId(null); // Collapse view to avoid duplication
  };

  const saveQuestion = (qData: Questionnaire) => {
    if (editingQuestionId) {
      setQuestionnaires(
        questionnaires.map((q) => (q.id === editingQuestionId ? qData : q)),
      );
    } else {
      setQuestionnaires([...questionnaires, qData]);
    }
    cancelQuestionEdit();
  };

  const cancelQuestionEdit = () => {
    setIsAddingQuestion(false);
    setEditingQuestionId(null);
    setTempQuestion({});
  };

  const deleteQuestion = (id: string) => {
    setQuestionnaires(questionnaires.filter((q) => q.id !== id));
  };

  // --- Existing Resource/Media Handlers ---
  const addResourceRow = () => {
    setResources([
      ...resources,
      {
        type: "file",
        label: "",
        value: "",
        resource_from: "content",
        is_downloadable: false,
        addToResourcesPage: false,
      },
    ]);
  };

  const updateResource = (index: number, field: keyof Resource, value: any) => {
    const newResources = [...resources];
    if (field === "file") {
      const file = value as File;
      newResources[index].file = file;
      newResources[index].value = file.name;
    } else {
      (newResources[index] as any)[field] = value;
    }
    setResources(newResources);
  };

  const removeResource = (index: number) => {
    const newResources = [...resources];
    newResources.splice(index, 1);
    setResources(newResources);
  };

  const mediaItemsRef = useRef(mediaItems);
  mediaItemsRef.current = mediaItems;

  const handleMediaClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    mediaInputRef.current?.click();
  };

  const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFiles = Array.from(e.target.files);

    const sizeError = selectedFiles
      .map((file) => validateMediaFileSize(file))
      .find(Boolean);
    if (sizeError) {
      showToast(sizeError, "error");
      e.target.value = "";
      return;
    }

    const withDuration = await Promise.all(
      selectedFiles.map(async (file) => ({
        file,
        duration: await getMediaDurationInSeconds(file),
      })),
    );
    const hasShortMedia = withDuration.some(
      ({ duration }) => duration > 0 && duration < MIN_MEDIA_DURATION_SECONDS,
    );
    if (hasShortMedia) {
      showToast(MEDIA_DURATION_ERROR_MESSAGE, "error");
      e.target.value = "";
      return;
    }

    const newItems: MediaItem[] = withDuration.map(({ file, duration }) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      previewUrl: URL.createObjectURL(file),
      type: (file.type.startsWith("video") ? "video" : "audio") as
        | "video"
        | "audio",
      duration,
    }));
    setMediaItems([...mediaItemsRef.current, ...newItems]);
    e.target.value = "";
  };

  const removeMedia = (id: string | number) => {
    setMediaItems(
      mediaItemsRef.current.filter((m) => String(m.id) !== String(id)),
    );
  };

  const getMediaSource = (item: MediaItem) => {
    return item.path || item.previewUrl || "";
  };

  const openGeneratedVideoPreview = (media: GeneratedMediaEntry) => {
    if (media.type !== "video") return;
    const src = media.playbackUrl || media.url;
    if (!src) return;
    setPreviewMediaItem({
      id: `generated-${media.url.slice(0, 48)}`,
      type: "video",
      path: src,
      previewUrl: src,
      thumbnail_path: media.thumbnailUrl,
      name: media.title || "Generated video",
    });
  };

  const renderMediaThumbnail = (item: MediaItem) => (
    <div key={item.id} className={styles.mediaItemContainer}>
      <div
        className={styles.mediaCard}
        onClick={(e) => {
          e.stopPropagation();
          setPreviewMediaItem(item);
        }}
      >
        <div
          className={`${styles.mediaThumbnailPlaceholder} ${
            item.thumbnail_path ? styles.mediaThumbnailWithImage : ""
          }`}
          style={{
            backgroundImage: item.thumbnail_path
              ? `url(${item.thumbnail_path})`
              : item.type === "video" && getMediaSource(item)
              ? `url(${getMediaSource(item)})`
              : undefined,
          }}
        >
          <div className={styles.playIconCircle}>
            {item.type === "video" ? "▶" : "🎵"}
          </div>
        </div>
        <button
          className={styles.removeMediaBtn}
          onClick={(e) => {
            e.stopPropagation();
            removeMedia(item.id);
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <div className={styles.sectionHeader} style={{ marginBottom: "16px" }}>
        <div className={styles.sectionTitle} style={{ marginBottom: 0 }}>
          Content Section
        </div>
        {contentSectionActions}
      </div>

      <div className={styles.inputGroup} style={{ marginBottom: "24px" }}>
        <label className={styles.inputLabel}>
          Title<span>*</span>
        </label>
        <input
          className={styles.textInput}
          placeholder="Enter the content title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className={styles.inputGroup} style={{ marginBottom: "24px" }}>
        <label className={styles.inputLabel}>
          Content<span>*</span>
        </label>
        <RichTextEditor
          content={content}
          onChange={setContent}
          showColorPicker={true}
        />
      </div>

      {/* Additional Resources */}
      {!isPastDate && (
        <>
          <div
            className={styles.sectionHeader}
            style={{ marginBottom: "16px" }}
          >
            <label className={styles.inputLabel} style={{ marginBottom: 0 }}>
              Additional Resources{" "}
              <span style={{ fontWeight: 400, color: "#6B7280" }}>
                [Add multiple files and URLs]
              </span>
            </label>
            <span className={styles.addMoreLink} onClick={addResourceRow}>
              Add more
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              marginBottom: "24px",
            }}
          >
            {resources.map((res, index) => (
              <div key={index} className={styles.resourceCard}>
                <div className={styles.resourceRowHeader}>
                  <span
                    className={styles.removeResourceIcon}
                    onClick={() => removeResource(index)}
                  >
                    ✕
                  </span>
                </div>
                <div className={styles.resourceMainRow}>
                  <div className={styles.resourceTypeDropdownWrapper}>
                    <select
                      className={styles.resourceTypeSelect}
                      value={res.type}
                      onChange={(e) =>
                        updateResource(index, "type", e.target.value as any)
                      }
                    >
                      <option value="file">Add File</option>
                      <option value="url">Add URL</option>
                    </select>
                  </div>

                  <div className={styles.resourceValueInputArea}>
                    {res.type === "file" ? (
                      <div className={styles.fileInputContainer}>
                        <div
                          className={styles.fileInputDisplay}
                          onClick={() =>
                            document
                              .getElementById(`res-file-${index}`)
                              ?.click()
                          }
                        >
                          {res.value ? (
                            <span className={styles.selectedFileName}>{res.value}</span>
                          ) : (
                            <span style={{ color: "#9CA3AF" }}>
                              Click to browse & add file (PDF, JPEG or PNG)
                            </span>
                          )}
                        </div>
                        <input
                          id={`res-file-${index}`}
                          type="file"
                          hidden
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              updateResource(index, "file", file);
                              updateResource(index, "value", file.name);
                            }
                          }}
                        />
                        <button
                          className={styles.resourceBrowseBtn}
                          onClick={() =>
                            document
                              .getElementById(`res-file-${index}`)
                              ?.click()
                          }
                        >
                          Browse
                        </button>
                      </div>
                    ) : (
                      <input
                        className={styles.resourceURLInput}
                        placeholder="https://..."
                        value={res.value || ""}
                        onChange={(e) =>
                          updateResource(index, "value", e.target.value)
                        }
                      />
                    )}
                  </div>
                </div>

                <div className={styles.resourceOptionsRow}>
                  <div className={styles.resourceLabelInputWrapper}>
                    <input
                      className={styles.resourceLabelInput}
                      placeholder="Add File Name"
                      value={res.label || ""}
                      onChange={(e) =>
                        updateResource(index, "label", e.target.value)
                      }
                    />
                  </div>
                  <div className={styles.resourceFlags}>
                    <label className={styles.resourceCheckboxLabel}>
                      <input
                        type="checkbox"
                        className={styles.orangeCheckbox}
                        checked={!!res.addToResourcesPage}
                        onChange={(e) =>
                          updateResource(
                            index,
                            "addToResourcesPage",
                            e.target.checked,
                          )
                        }
                      />
                      Add to Resources Page
                      <span className={styles.infoCircle}>i</span>
                    </label>
                    {res.type === "file" && (
                      <label className={styles.resourceCheckboxLabel}>
                        <input
                          type="checkbox"
                          className={styles.orangeCheckbox}
                          checked={!!res.is_downloadable}
                          onChange={(e) =>
                            updateResource(
                              index,
                              "is_downloadable",
                              e.target.checked,
                            )
                          }
                        />
                        Downloadable
                      </label>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Upload Audio/Video */}
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle} style={{ marginBottom: 0 }}>
          Audio or Video
        </div>
        {mediaItems.length > 0 &&
          !(
            isAI &&
            (videoScript || (generatedMedia && generatedMedia.length > 0))
          ) && (
            <button
              className={styles.uploadMediaBtn}
              onClick={handleMediaClick}
            >
              Upload Media
            </button>
          )}
      </div>

      {isAI &&
      (videoScript || (generatedMedia && generatedMedia.length > 0)) ? (
        <div className={styles.videoScriptSection}>
          {hasGeneratedVideo ? (
            <div
              className={styles.scriptCard}
              style={{ justifyContent: "center", gap: "16px" }}
            >
              {generatedMedia
                ?.filter((media) => media.type === "video")
                .map((media, idx) => (
                  <div key={idx} style={{ width: "100%" }}>
                    <div
                      className={styles.generatedVideoCard}
                      role="button"
                      tabIndex={0}
                      onClick={() => openGeneratedVideoPreview(media)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openGeneratedVideoPreview(media);
                        }
                      }}
                    >
                      <div
                        className={`${styles.mediaThumbnailPlaceholder} ${
                          media.thumbnailUrl
                            ? styles.mediaThumbnailWithImage
                            : ""
                        }`}
                        style={{
                          minHeight: "160px",
                          backgroundImage: media.thumbnailUrl
                            ? `url(${media.thumbnailUrl})`
                            : undefined,
                        }}
                      >
                        <div className={styles.playIconCircle}>
                          <span aria-hidden="true">▶</span>
                        </div>
                      </div>
                      {media.title ? (
                        <div className={styles.generatedVideoCaption}>
                          {media.title}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
            </div>
          ) : generatedMedia && generatedMedia.length > 0 ? (
            <div
              className={styles.scriptCard}
              style={{ justifyContent: "center", gap: "16px" }}
            >
              {generatedMedia.map((media, idx) => (
                <div key={idx} style={{ width: "100%" }}>
                  {media.type === "video" ? (
                    <div
                      className={styles.generatedVideoCard}
                      role="button"
                      tabIndex={0}
                      onClick={() => openGeneratedVideoPreview(media)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openGeneratedVideoPreview(media);
                        }
                      }}
                    >
                      <div
                        className={`${styles.mediaThumbnailPlaceholder} ${
                          media.thumbnailUrl
                            ? styles.mediaThumbnailWithImage
                            : ""
                        }`}
                        style={{
                          minHeight: "160px",
                          backgroundImage: media.thumbnailUrl
                            ? `url(${media.thumbnailUrl})`
                            : undefined,
                        }}
                      >
                        <div className={styles.playIconCircle}>
                          <span aria-hidden="true">▶</span>
                        </div>
                      </div>
                      {media.title ? (
                        <div className={styles.generatedVideoCaption}>
                          {media.title}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "12px",
                        padding: "16px 0",
                      }}
                    >
                      <div
                        className={styles.playIconCircle}
                        style={{
                          width: "48px",
                          height: "48px",
                          fontSize: "18px",
                        }}
                      >
                        🎵
                      </div>
                      <audio
                        src={media.url}
                        controls
                        style={{ width: "100%" }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.scriptCard}>
              {isGeneratingVideo ? (
                <div className={styles.generatingVideoState}>
                  <h3 className={styles.generatingVideoTitle}>
                    Generating Video...
                  </h3>
                  <img
                    src="/assets/ai/loader.gif"
                    alt="Generating video"
                    className={styles.generatingVideoGif}
                  />
                  <p className={styles.generatingVideoDescription}>
                    This may take a few minutes. You can continue with other
                    tasks and return later to review this content
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ maxHeight: 200, overflowY: "auto" }}>
                    <RichTextEditor
                      content={videoScript || ""}
                      showToolbar={false}
                      editable={false}
                    />
                  </div>
                  <div className={styles.scriptActions}>
                    <span
                      className={styles.deleteScriptLink}
                      onClick={onDeleteScript}
                    >
                      Delete this Script
                    </span>
                    <button
                      className={styles.reviewScriptBtn}
                      type="button"
                      onClick={onReviewScript}
                    >
                      Review Script
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          <div className={styles.uploadScriptArea}>
            {mediaItems.length > 0 ? (
              <>
                <div className={styles.mediaGrid} style={{ width: "100%" }}>
                  {mediaItems.map(renderMediaThumbnail)}
                </div>
                <button
                  className={styles.uploadMediaBtn}
                  style={{ marginTop: "12px" }}
                  onClick={handleMediaClick}
                >
                  Upload More Media
                </button>
              </>
            ) : (
              <>
                <p className={styles.uploadScriptText}>
                  Upload your own video or audio files
                </p>
                <button
                  className={styles.actionBtn}
                  type="button"
                  onClick={handleMediaClick}
                >
                  Add Video/Audio
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          {mediaItems.length > 0 ? (
            <div className={styles.mediaGrid}>
              {mediaItems.map(renderMediaThumbnail)}
            </div>
          ) : (
            <div className={styles.uploadArea} onClick={handleMediaClick}>
              <p className={styles.uploadText}>Drag & Drop file to upload</p>
              <p className={styles.uploadSubtext}>or</p>
              <button className={styles.uploadBtn}>Browse File</button>
            </div>
          )}
        </>
      )}
      <input
        type="file"
        ref={mediaInputRef}
        hidden
        accept="video/*,audio/*"
        multiple
        onChange={handleMediaChange}
      />

      <MediaPreviewModal
        item={previewMediaItem}
        onClose={() => setPreviewMediaItem(null)}
      />

      <>
        <div style={{ height: 32 }}></div>
        {/* Assessment */}
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle} style={{ marginBottom: 0 }}>
            Assessment
          </div>
          {!isPastDate &&
            !isAddingQuestion &&
            !editingQuestionId &&
            questionnaires.length > 0 && (
              <button
                className={styles.uploadMediaBtn}
                onClick={startAddQuestion}
              >
                Add Questionnaire
              </button>
            )}
        </div>

        {/* Modal Components */}
        <QuestionModal
          isOpen={isAddingQuestion || !!editingQuestionId}
          onClose={cancelQuestionEdit}
          onSave={saveQuestion}
          initialData={editingQuestionId ? tempQuestion : null}
          itemNumber={questionnaires.length + (editingQuestionId ? 0 : 1)}
        />

        <TaskModal
          isOpen={isAddingTask || !!editingTaskId}
          onClose={cancelTaskEdit}
          onSave={saveTask}
          initialData={editingTaskId ? tempTask : null}
          itemNumber={tasks.length + (editingTaskId ? 0 : 1)}
        />

        {/* Question List */}
        {questionnaires.map((q, i) => (
          <div
            key={q.id}
            className={
              expandedQuestionId === q.id
                ? styles.questionItemActive
                : styles.questionItem
            }
          >
            <div
              className={styles.questionHeader}
              onClick={() =>
                setExpandedQuestionId(expandedQuestionId === q.id ? null : q.id)
              }
            >
              <div className={styles.questionTitle}>
                <span>Q{i + 1}</span>
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                  className="tiptap-rendered-content"
                  dangerouslySetInnerHTML={{ __html: q.question }}
                ></span>
              </div>
              <div className={styles.questionActions}>
                <div
                  className={styles.emptySquareBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveQuestionDropdown(
                      activeQuestionDropdown === q.id ? null : q.id,
                    );
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                </div>

                {activeQuestionDropdown === q.id && (
                  <>
                    <div
                      style={{ position: "fixed", inset: 0, zIndex: 9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveQuestionDropdown(null);
                      }}
                    />
                    <div
                      className={styles.taskMenuDropdown}
                      style={{ top: "38px", right: "40px" }}
                    >
                      <button
                        className={styles.taskMenuItem}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveQuestionDropdown(null);
                          startEditQuestion(q);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className={styles.taskMenuItem}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveQuestionDropdown(null);
                          deleteQuestion(q.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}

                <div className={styles.chevronIcon}>
                  {expandedQuestionId === q.id ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="18 15 12 9 6 15"></polyline>
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  )}
                </div>
              </div>
            </div>

            {expandedQuestionId === q.id && (
              <div className={styles.questionBody}>
                {(["A", "B", "C", "D"] as const).map((opt) => (
                  <div key={opt} className={styles.optionRow}>
                    {q.right_answer === opt ? (
                      <div className={styles.correctCheckIcon}>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                    ) : (
                      <div className={styles.emptySpaceCircle}></div>
                    )}
                    <span
                      className={
                        q.right_answer === opt ? styles.correctOption : ""
                      }
                    >
                      {(q as any)[`option_${opt.toLowerCase()}`]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {questionnaires.length === 0 && !isAddingQuestion && (
          <div className={styles.cardSection}>
            <h4 className={styles.cardTitle}>
              Enhance learning impact by adding an assessment
            </h4>
            <p className={styles.cardDesc}>
              Use short, objective-type questions to reinforce key takeaways...
            </p>
            {!isPastDate && (
              <button className={styles.actionBtn} onClick={startAddQuestion}>
                Add Questionnaire
              </button>
            )}
          </div>
        )}

        <div style={{ height: 24 }}></div>

        {/* Tasks */}
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle} style={{ marginBottom: 0 }}>
            Tasks
          </div>
          {!isPastDate &&
            !isAddingTask &&
            !editingTaskId &&
            tasks.length > 0 && (
              <button className={styles.uploadMediaBtn} onClick={startAddTask}>
                Add Task
              </button>
            )}
        </div>

        {/* Task List */}
        <div className={styles.taskList}>
          {tasks.map((t, index) => (
            <div
              key={t.id}
              className={styles.taskCard}
              onClick={() =>
                setActiveTaskDropdown(activeTaskDropdown === t.id ? null : t.id)
              }
              style={{ cursor: "pointer" }}
            >
              <div className={styles.taskHeader}>
                <span className={styles.taskTitle}>
                  Task {index + 1}{" "}
                  <span>
                    (
                    {(t.category || t.type || "").toLowerCase().includes("pow")
                      ? "PoW"
                      : (t.category || t.type || "")
                          .toLowerCase()
                          .includes("poi")
                      ? "PoI"
                      : (t.category || t.type || "")
                          .toLowerCase()
                          .includes("poa")
                      ? "PoA"
                      : "General"}
                    )
                  </span>
                </span>
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                    position: "relative",
                  }}
                >
                  <span className={styles.taskPoints}>{t.point} Points</span>
                  <button
                    className={styles.menuDotsBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTaskDropdown(
                        activeTaskDropdown === t.id ? null : t.id,
                      );
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="12" cy="5" r="1" />
                      <circle cx="12" cy="19" r="1" />
                    </svg>
                  </button>

                  {activeTaskDropdown === t.id && (
                    <>
                      <div
                        style={{ position: "fixed", inset: 0, zIndex: 9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTaskDropdown(null);
                        }}
                      />
                      <div
                        className={styles.taskMenuDropdown}
                        style={{ top: "28px" }}
                      >
                        <button
                          className={styles.taskMenuItem}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTaskDropdown(null);
                            startEditTask(t);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className={styles.taskMenuItem}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTaskDropdown(null);
                            deleteTask(t.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              {/* Render HTML content from RichTextEditor */}
              <div
                className={`${styles.taskDesc} tiptap-rendered-content`}
                dangerouslySetInnerHTML={{ __html: t.description }}
              ></div>

              <div className={styles.taskFooter}>
                <div className={styles.badgeRow}>
                  {t.action && t.action.length > 0 ? (
                    t.action.map((act, idx) => (
                      <span
                        key={idx}
                        className={styles.taskActionBadge}
                        style={
                          !isValidMicroAction(act)
                            ? {
                                color: "var(--color-error)",
                                background: "color-mix(in srgb, var(--color-error) 12%, transparent)",
                                border: "1px solid var(--color-error)",
                              }
                            : undefined
                        }
                        title={!isValidMicroAction(act) ? "Not a valid micro-action — open the task to remove it" : undefined}
                      >
                        {act}
                      </span>
                    ))
                  ) : (
                    <span className={styles.taskNoAction}>
                      No micro-actions added
                    </span>
                  )}
                </div>

                {((t as any).file || (t as any).attachment) && (
                  <div
                    className={styles.taskAttachmentIcon}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                    </svg>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {tasks.length === 0 && !isAddingTask && (
          <div className={styles.cardSection}>
            <h4 className={styles.cardTitle}>Encourage learning by doing</h4>
            <p className={styles.cardDesc}>Add simple, action-based tasks...</p>
            {!isPastDate && (
              <button className={styles.actionBtn} onClick={startAddTask}>
                Add Tasks
              </button>
            )}
          </div>
        )}

        <div style={{ height: 24 }}></div>

        <div className={styles.virtualMeetingSection}>
          <div className={styles.sectionTitle} style={{ marginBottom: 12 }}>
            Virtual Meeting
          </div>
          <div className={styles.virtualMeetingCard}>
            <div className={styles.virtualMeetingToggleRow}>
              <div
                className={`${styles.toggleSwitch} ${
                  meetingEnabled ? styles.active : ""
                }`}
                onClick={() => setMeetingEnabled?.(!meetingEnabled)}
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
              className={styles.virtualMeetingLinkInput}
              placeholder="https://meet.google.com/..."
              value={meetingLink}
              onChange={(e) => setMeetingLink?.(e.target.value)}
            />
            <div className={styles.virtualMeetingTimeRow}>
              <select
                className={styles.selectInput}
                value={meetingHour}
                onChange={(e) => setMeetingHour?.(e.target.value)}
              >
                {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => (
                  <option key={h} value={h.toString().padStart(2, "0")}>
                    {h.toString().padStart(2, "0")}
                  </option>
                ))}
              </select>
              <select
                className={styles.selectInput}
                value={meetingMinute}
                onChange={(e) => setMeetingMinute?.(e.target.value)}
              >
                {['00', '15', '30', '45'].map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
              <select
                className={styles.selectInput}
                value={meetingAmPm}
                onChange={(e) => setMeetingAmPm?.(e.target.value)}
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </div>
        </div>
      </>
    </div>
  );
}
