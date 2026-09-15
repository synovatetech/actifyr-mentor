"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import styles from "@/styles/badges-points.module.css";

export interface CustomPointFormData {
  title: string;
  description: string;
  max_point: number;
}

interface CustomPointModalProps {
  isOpen: boolean;
  isEdit?: boolean;
  initialData?: {
    title?: string;
    description?: string;
    max_point?: number;
  } | null;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (data: CustomPointFormData) => void;
}

export default function CustomPointsModal({
  isOpen,
  isEdit = false,
  initialData = null,
  isSaving = false,
  onClose,
  onSave,
}: CustomPointModalProps) {
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [maxPoint, setMaxPoint] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(initialData?.title || "");
    setDescription(initialData?.description || "");
    setMaxPoint(
      initialData?.max_point != null ? String(initialData.max_point) : "",
    );
  }, [isOpen, initialData]);

  const maxPointValue = Number(maxPoint);
  const canSave = useMemo(() => {
    return (
      title.trim().length > 0 &&
      description.trim().length > 0 &&
      Number.isFinite(maxPointValue) &&
      maxPointValue > 0 &&
      !isSaving
    );
  }, [title, description, maxPointValue, isSaving]);

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      title: title.trim(),
      description: description.trim(),
      max_point: maxPointValue,
    });
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContainer}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>Configure New Custom Point</div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Title</label>
          <input
            className={styles.input}
            placeholder="Enter title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Description</label>
          <textarea
            className={`${styles.input} ${styles.customPointTextarea}`}
            placeholder="Enter custom point description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Max Points</label>
          <input
            type="number"
            min="1"
            className={styles.input}
            placeholder="Enter Points"
            value={maxPoint}
            onChange={(event) => setMaxPoint(event.target.value)}
          />
        </div>
        <div className={`${styles.modalFooter} ${styles.customPointFooter}`}>
          <button
            className={`${styles.closeBtn} ${styles.customPointActionBtn}`}
            type="button"
            onClick={onClose}
            disabled={isSaving}
          >
            Close
          </button>
          <button
            className={`${styles.saveBtn} ${styles.customPointActionBtn}`}
            type="button"
            onClick={handleSave}
            disabled={!canSave}
          >
            {isSaving ? "Saving..." : isEdit ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
