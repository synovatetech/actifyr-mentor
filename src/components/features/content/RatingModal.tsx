"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "@/styles/add-content-modal.module.css";
import {
  RATING_SCALE_MIN,
  RATING_SCALE_MAX,
  generateDefaultRatingLabels,
} from "@/components/features/content/content-builder.types";

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: any;
  itemNumber: number;
}

const DEFAULT_SCALE_POINTS = 5;

export default function RatingModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  itemNumber,
}: RatingModalProps) {
  const [mounted, setMounted] = useState(false);
  const [question, setQuestion] = useState("");
  const [scalePoints, setScalePoints] = useState(DEFAULT_SCALE_POINTS);
  const [labels, setLabels] = useState<string[]>(
    generateDefaultRatingLabels(DEFAULT_SCALE_POINTS),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setQuestion(initialData.question || "");
        const points = initialData.scalePoints || DEFAULT_SCALE_POINTS;
        setScalePoints(points);
        setLabels(
          Array.isArray(initialData.labels) && initialData.labels.length === points
            ? initialData.labels
            : generateDefaultRatingLabels(points),
        );
      } else {
        setQuestion("");
        setScalePoints(DEFAULT_SCALE_POINTS);
        setLabels(generateDefaultRatingLabels(DEFAULT_SCALE_POINTS));
      }
      setErrors({});
    }
  }, [isOpen, initialData]);

  if (!mounted || !isOpen) return null;

  const handleScaleChange = (points: number) => {
    setScalePoints(points);
    setLabels(generateDefaultRatingLabels(points));
  };

  const updateLabel = (index: number, value: string) => {
    setLabels((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!question.trim()) nextErrors.question = "Question is required";
    if (labels.some((l) => !l.trim())) nextErrors.labels = "Every scale label needs text";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      question,
      scalePoints,
      labels,
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
            {initialData ? "Edit" : "Add"} Rating Question #{itemNumber}
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
              style={{ minHeight: "80px" }}
              placeholder="e.g. How confident do you feel about this topic?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            {errors.question && (
              <div
                style={{ color: "#DC2626", fontSize: "12px", marginTop: "6px" }}
              >
                {errors.question}
              </div>
            )}
          </div>

          <div className={styles.inputGroup}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label className={styles.commonLabel} style={{ marginBottom: 0 }}>
                Scale
              </label>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-primary)" }}>
                {scalePoints} points
              </span>
            </div>
            <input
              type="range"
              min={RATING_SCALE_MIN}
              max={RATING_SCALE_MAX}
              step={1}
              value={scalePoints}
              onChange={(e) => handleScaleChange(Number(e.target.value))}
              className={styles.scaleSlider}
              style={{ marginTop: 8 }}
            />
            <div className={styles.scaleEndpoints} style={{ marginTop: 4, marginBottom: 12 }}>
              {Array.from(
                { length: RATING_SCALE_MAX - RATING_SCALE_MIN + 1 },
                (_, i) => RATING_SCALE_MIN + i,
              ).map((point) => (
                <span
                  key={point}
                  style={
                    point === scalePoints
                      ? { color: "var(--color-primary)", fontWeight: 700 }
                      : undefined
                  }
                >
                  {point}
                </span>
              ))}
            </div>

            <div className={styles.scaleLabelGrid}>
              {labels.map((text, i) => (
                <div key={i} className={styles.scaleLabelCell}>
                  <span className={styles.scaleLabelCellNumber}>{i + 1}</span>
                  <input
                    className={styles.scaleLabelInputCompact}
                    value={text}
                    onChange={(e) => updateLabel(i, e.target.value)}
                    title={`Label for point ${i + 1}`}
                  />
                </div>
              ))}
            </div>
            {errors.labels && (
              <div style={{ color: "#DC2626", fontSize: "12px", marginTop: "6px" }}>
                {errors.labels}
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
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
