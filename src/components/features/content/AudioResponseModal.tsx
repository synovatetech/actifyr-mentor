"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "@/styles/add-content-modal.module.css";
import { AUDIO_RESPONSE_MAX_DURATION_SECONDS } from "@/components/features/content/content-builder.types";

interface AudioResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: any;
  itemNumber: number;
}

export default function AudioResponseModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  itemNumber,
}: AudioResponseModalProps) {
  const [mounted, setMounted] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setInstruction(initialData?.instruction || "");
      setErrors({});
    }
  }, [isOpen, initialData]);

  if (!mounted || !isOpen) return null;

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!instruction.trim()) nextErrors.instruction = "Instruction is required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      instruction,
      maxDurationSeconds: AUDIO_RESPONSE_MAX_DURATION_SECONDS,
    });
    onClose();
  };

  return createPortal(
    <div className={styles.modalOverlay} style={{ zIndex: 100000 }}>
      <div
        className={styles.modalContainer}
        style={{ width: "560px", height: "auto", maxHeight: "90vh" }}
      >
        <div className={styles.modalHeader}>
          <div
            className={styles.modalTitle}
            style={{ color: "var(--color-primary)" }}
          >
            {initialData ? "Edit" : "Add"} Audio Question #{itemNumber}
          </div>
          <div className={styles.closeIcon} onClick={onClose}>
            ✕
          </div>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.inputGroup} style={{ marginBottom: "20px" }}>
            <label className={styles.commonLabel}>
              Instruction<span style={{ color: "#DC2626" }}>*</span>
            </label>
            <textarea
              className={styles.commonTextarea}
              style={{ minHeight: "80px" }}
              placeholder="e.g. Record yourself practising this pitch out loud"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
            />
            {errors.instruction && (
              <div
                style={{ color: "#DC2626", fontSize: "12px", marginTop: "6px" }}
              >
                {errors.instruction}
              </div>
            )}
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.commonLabel}>Max Recording Duration</label>
            <div className={styles.fixedValueBadge}>Fixed at 5:00 minutes</div>
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
