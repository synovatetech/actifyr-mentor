"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "@/styles/add-content-modal.module.css";

interface TrueFalseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: any;
  itemNumber: number;
}

export default function TrueFalseModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  itemNumber,
}: TrueFalseModalProps) {
  const [mounted, setMounted] = useState(false);
  const [statement, setStatement] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setStatement(initialData.statement || "");
      } else {
        setStatement("");
      }
      setErrors({});
    }
  }, [isOpen, initialData]);

  if (!mounted || !isOpen) return null;

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!statement.trim()) nextErrors.statement = "Statement is required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      statement,
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
            {initialData ? "Edit" : "Add"} Statement #{itemNumber}
          </div>
          <div className={styles.closeIcon} onClick={onClose}>
            ✕
          </div>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.inputGroup} style={{ marginBottom: "20px" }}>
            <label className={styles.commonLabel}>
              Statement<span style={{ color: "#DC2626" }}>*</span>
            </label>
            <textarea
              className={styles.commonTextarea}
              style={{ minHeight: "80px" }}
              placeholder="Enter the statement"
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
            />
            {errors.statement && (
              <div
                style={{ color: "#DC2626", fontSize: "12px", marginTop: "6px" }}
              >
                {errors.statement}
              </div>
            )}
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
            Save Statement
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
