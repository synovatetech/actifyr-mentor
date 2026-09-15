"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "@/styles/add-content-modal.module.css";

interface ReflectionPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: any;
  itemNumber: number;
}

export default function ReflectionPromptModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  itemNumber,
}: ReflectionPromptModalProps) {
  const [mounted, setMounted] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [minChars, setMinChars] = useState<number | "">("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setPrompt(initialData.prompt || "");
        setMinChars(
          initialData.minChars !== undefined && initialData.minChars !== null
            ? initialData.minChars
            : "",
        );
      } else {
        setPrompt("");
        setMinChars("");
      }
      setErrors({});
    }
  }, [isOpen, initialData]);

  if (!mounted || !isOpen) return null;

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!prompt.trim()) nextErrors.prompt = "Question is required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      prompt,
      minChars: minChars === "" ? undefined : Number(minChars),
    });
    onClose();
  };

  return createPortal(
    <div className={styles.modalOverlay} style={{ zIndex: 100000 }}>
      <div
        className={styles.modalContainer}
        style={{ width: "600px", height: "auto", maxHeight: "90vh" }}
      >
        <div className={styles.modalHeader}>
          <div
            className={styles.modalTitle}
            style={{ color: "var(--color-primary)" }}
          >
            {initialData ? "Edit" : "Add"} Reflection Question #{itemNumber}
          </div>
          <div className={styles.closeIcon} onClick={onClose}>
            ✕
          </div>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.inputGroup} style={{ marginBottom: "20px" }}>
            <label className={styles.commonLabel}>
              Question<span style={{ color: "#DC2626" }}>*</span>
            </label>
            <textarea
              className={styles.commonTextarea}
              style={{ minHeight: "120px" }}
              placeholder="Enter a scenario-based reflection question"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            {errors.prompt && (
              <div
                style={{ color: "#DC2626", fontSize: "12px", marginTop: "6px" }}
              >
                {errors.prompt}
              </div>
            )}
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.commonLabel}>
              Minimum Character Count{" "}
              <span style={{ color: "#9CA3AF", fontWeight: 400 }}>
                (Optional)
              </span>
            </label>
            <input
              type="number"
              min={0}
              className={styles.commonInput}
              placeholder="e.g. 100"
              value={minChars}
              onChange={(e) =>
                setMinChars(e.target.value === "" ? "" : parseInt(e.target.value, 10))
              }
            />
          </div>
        </div>

        <div
          className={styles.modalFooterCentered}
          style={{ width: "100%", boxSizing: "border-box" }}
        >
          <button className={styles.cancelBtnCentered} onClick={onClose}>
            Close
          </button>
          <button className={styles.saveBtnCentered} onClick={handleSave}>
            Save Question
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
