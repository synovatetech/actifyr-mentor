"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "@/styles/add-content-modal.module.css";
import RichTextEditor from "@/components/common/RichTextEditor";
import {
  MAX_MICRO_ACTIONS_PER_TASK,
  MICRO_ACTIONS,
  TASK_TYPE_TO_CATEGORY_LABEL,
  isValidMicroAction,
  isValidTaskCategory,
} from "@/utils/task-options";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: any;
  itemNumber: number;
  /**
   * Restricts the modal to Task description only — used for per-language
   * task translation, where category/points/micro-actions/file attachment
   * always mirror English and aren't editable per language.
   */
  descriptionOnly?: boolean;
  /** Overrides the "Add/Edit Task #N" header, e.g. "Task 1 — Hindi" for translation mode. */
  headerTitle?: string;
}

export default function TaskModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  itemNumber,
  descriptionOnly = false,
  headerTitle,
}: TaskModalProps) {
  const normalizeMicroAction = (action: string) =>
    action === "Submit File" ? "Submit" : action;

  const normalizeMicroActions = (list: string[] = []) =>
    Array.from(
      new Set(
        list
          .map((item) => normalizeMicroAction(String(item || "").trim()))
          .filter(Boolean),
      ),
    );

  const [mounted, setMounted] = useState(false);

  const [category, setCategory] = useState("Proof of Action (PoA)");
  const [points, setPoints] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [actions, setActions] = useState<string[]>([]);

  // Dropdown UI specific states
  const [showMicroActions, setShowMicroActions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  const microActionRef = useRef<HTMLDivElement>(null);

  // Close micro-actions dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        microActionRef.current &&
        !microActionRef.current.contains(event.target as Node)
      ) {
        setShowMicroActions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        let initialCategory: string = "Proof of Action (PoA)";
        if (initialData.type) {
          const t = initialData.type.toLowerCase();
          if (t === "pow") initialCategory = TASK_TYPE_TO_CATEGORY_LABEL.PoW;
          if (t === "poa") initialCategory = TASK_TYPE_TO_CATEGORY_LABEL.PoA;
          if (t === "poi") initialCategory = TASK_TYPE_TO_CATEGORY_LABEL.PoI;
          if (t === "general") initialCategory = TASK_TYPE_TO_CATEGORY_LABEL.general;
        }
        // Falls back to the type-derived category when the stored value doesn't
        // match one of the four dropdown options (e.g. arbitrary CSV import
        // text) — otherwise the <select> would be bound to a value with no
        // matching <option> and render blank.
        setCategory(
          initialData.category && isValidTaskCategory(initialData.category)
            ? initialData.category
            : initialCategory,
        );
        setDescription(initialData.description || "");
        setActions(normalizeMicroActions(initialData.action || []));
        setPoints(initialData.point !== undefined ? initialData.point : "");
        setAttachedFile(initialData.file || null);
      } else {
        setCategory("Proof of Action (PoA)");
        setDescription("");
        setActions([]);
        setPoints("");
        setAttachedFile(null);
      }
      setShowMicroActions(false);
    }
  }, [isOpen, initialData]);

  if (!mounted || !isOpen) return null;

  const toggleAction = (action: string) => {
    if (actions.includes(action)) {
      setActions(actions.filter((a) => a !== action));
    } else {
      // max micro actions per task
      if (actions.length < MAX_MICRO_ACTIONS_PER_TASK) {
        setActions([...actions, action]);
      }
    }
  };

  const removeAction = (action: string) => {
    setActions(actions.filter((a) => a !== action));
  };

  const invalidActions = actions.filter((a) => !isValidMicroAction(a));

  const handleSave = () => {
    if (!description.trim()) return;

    if (descriptionOnly) {
      onSave({ description });
      onClose();
      return;
    }

    let backendType = "general";
    if (category === "Proof of Action (PoA)") backendType = "PoA";
    if (category === "Proof of Work (PoW)") backendType = "PoW";
    if (category === "Proof of Impact (PoI)") backendType = "PoI";

    onSave({
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      type: backendType,
      category,
      title: "Task",
      description,
      // Strips anything outside the Micro-actions dropdown (e.g. left over
      // from a CSV import predating this validation) so saving a task is
      // always enough to clean it up, even if the user never opened the
      // "unrecognized" list below to remove it manually.
      action: normalizeMicroActions(actions).filter(isValidMicroAction),
      point: points || 0,
      file: attachedFile || undefined,
    });
    onClose();
  };

  return createPortal(
    <div className={styles.modalOverlay} style={{ zIndex: 100000 }}>
      <div
        className={styles.modalContainer}
        style={{
          width: "640px",
          height: "auto",
          maxHeight: "95vh",
          overflow: "visible",
        }}
      >
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle} style={{ color: "#EE4621" }}>
            {headerTitle || `Add Task #${itemNumber}`}
          </div>
          <div className={styles.closeIcon} onClick={onClose}>
            ✕
          </div>
        </div>

        <div className={styles.modalBody}>
          {!descriptionOnly && (
            <div
              className={styles.formRow}
              style={{ marginBottom: "24px", display: "flex", gap: "24px" }}
            >
              <div style={{ flex: 1 }}>
                <label className={styles.commonLabel}>Task Category</label>
                <select
                  className={styles.selectInput}
                  style={{
                    width: "100%",
                    color: category ? "#1E1E1E" : "#9CA3AF",
                  }}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="" disabled>
                    Choose the category
                  </option>
                  <option value="Proof of Action (PoA)">
                    Proof of Action (PoA)
                  </option>
                  <option value="Proof of Work (PoW)">Proof of Work (PoW)</option>
                  <option value="Proof of Impact (PoI)">
                    Proof of Impact (PoI)
                  </option>
                  <option value="General">General</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className={styles.commonLabel}>Points on Completion</label>
                <div className={styles.pointsInputWrapper}>
                  <input
                    type="number"
                    className={styles.pointsInput}
                    placeholder="Enter Points Earned (Max 5)"
                    value={points}
                    onChange={(e) => setPoints(parseInt(e.target.value) || "")}
                    min="0"
                    max="50"
                  />
                </div>
              </div>
            </div>
          )}

          <div className={styles.inputGroup} style={{ marginBottom: "24px" }}>
            <label className={styles.commonLabel} style={{ marginBottom: 0 }}>
              Task
            </label>
            <div style={{ height: "8px" }}></div>
            <RichTextEditor
              content={description}
              onChange={setDescription}
              placeholder="Enter the task in brief"
              hideImageButton={true}
            />
          </div>

          {!descriptionOnly && (
          <div
            className={styles.inputGroup}
            style={{ marginBottom: "24px", position: "relative" }}
            ref={microActionRef}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <label className={styles.commonLabel} style={{ marginBottom: 0 }}>
                Micro-actions{" "}
                <span style={{ color: "#9CA3AF", fontWeight: 400 }}>
                  (Optional)
                </span>
              </label>
              <span className={styles.learnMoreLink}>
                Learn about micro-actions
              </span>
            </div>
            <div
              className={styles.microActionsDropdown}
              onClick={() => setShowMicroActions(!showMicroActions)}
            >
              <span>
                {actions.length > 0
                  ? actions.map((act, idx) => (
                      <span key={act}>
                        {idx > 0 && ", "}
                        <span
                          style={{
                            color: isValidMicroAction(act)
                              ? "#1E1E1E"
                              : "var(--color-error)",
                          }}
                        >
                          {act}
                        </span>
                      </span>
                    ))
                  : <span style={{ color: "#9CA3AF" }}>Add upto 2 micro-actions</span>}
              </span>
              <span className={styles.dropdownIcon}>▼</span>
            </div>
            {showMicroActions && (
              <div
                className={styles.microActionsList}
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 10,
                }}
              >
                {MICRO_ACTIONS.map((act) => (
                  <label key={act.id} className={styles.microActionItem}>
                    <input
                      type="checkbox"
                      className={styles.orangeCheckbox}
                      checked={actions.includes(act.id)}
                      onChange={() => toggleAction(act.id)}
                      disabled={
                        !actions.includes(act.id) &&
                        actions.length >= MAX_MICRO_ACTIONS_PER_TASK
                      }
                    />
                    <span className={styles.microActionLabel}>
                      <strong style={{ color: "#1E1E1E" }}>{act.id}</strong> -{" "}
                      {act.desc}
                    </span>
                  </label>
                ))}
                {invalidActions.length > 0 && (
                  <div
                    style={{
                      borderTop: "1px solid #E5E7EB",
                      marginTop: "8px",
                      paddingTop: "8px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--color-error)",
                        marginBottom: "6px",
                      }}
                    >
                      Not a valid micro-action (e.g. from an older CSV
                      import) — remove before saving:
                    </div>
                    {invalidActions.map((act) => (
                      <div
                        key={act}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "4px 0",
                        }}
                      >
                        <span style={{ color: "var(--color-error)", fontSize: "13px" }}>
                          {act}
                        </span>
                        <span
                          style={{
                            cursor: "pointer",
                            color: "var(--color-error)",
                            fontWeight: 600,
                            fontSize: "12px",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeAction(act);
                          }}
                        >
                          Remove
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          )}

          {!descriptionOnly && (
          <div className={styles.inputGroup} style={{ marginBottom: "20px" }}>
            <label className={styles.commonLabel}>Attach a File</label>
            <div className={styles.fileUploadArea}>
              {attachedFile ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    width: "100%",
                    alignItems: "center",
                    height: "100%",
                    padding: "0 16px",
                  }}
                >
                  <span className={styles.attachedFileName}>
                    {attachedFile.name}
                  </span>
                  <span
                    className={styles.removeFileLink}
                    onClick={() => setAttachedFile(null)}
                  >
                    Remove
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    width: "100%",
                    alignItems: "center",
                    height: "100%",
                    padding: "0 16px",
                  }}
                >
                  <span style={{ color: "#9CA3AF", fontSize: "13px" }}>
                    Upload any file related to this task
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      height: "100%",
                    }}
                  >
                    <div
                      style={{
                        width: "1px",
                        height: "24px",
                        background: "#E5E7EB",
                        marginRight: "16px",
                      }}
                    ></div>
                    <span
                      className={styles.browseFileLink}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Browse
                    </span>
                  </div>
                  <input
                    type="file"
                    hidden
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setAttachedFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
          )}
        </div>

        <div
          className={styles.modalFooterCentered}
          style={{ width: "100%", boxSizing: "border-box" }}
        >
          <button className={styles.cancelBtnCentered} onClick={onClose}>
            Close
          </button>
          <button className={styles.saveBtnCentered} onClick={handleSave}>
            Save Task
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
