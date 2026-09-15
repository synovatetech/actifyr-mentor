"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import styles from "@/styles/reward-custom-points-modal.module.css";

interface CustomPointTemplate {
  id: string;
  name: string;
  maxPoints: number;
}

interface RewardCustomPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReward: (payload: { templateId: string; points: number }) => void;
  templates?: CustomPointTemplate[];
  isSubmitting?: boolean;
}

export default function RewardCustomPointsModal({
  isOpen,
  onClose,
  onReward,
  templates = [],
  isSubmitting = false,
}: RewardCustomPointsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [points, setPoints] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedTemplateId("");
    setPoints("");
  }, [isOpen]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId),
    [templates, selectedTemplateId],
  );

  const parsedPoints = Number(points);
  const isPointsValid =
    Number.isFinite(parsedPoints) &&
    parsedPoints > 0 &&
    (!selectedTemplate || parsedPoints <= selectedTemplate.maxPoints);
  const canSubmit =
    templates.length > 0 && Boolean(selectedTemplateId) && isPointsValid && !isSubmitting;

  const handleReward = () => {
    if (!canSubmit) return;
    onReward({ templateId: selectedTemplateId, points: parsedPoints });
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Reward Custom Point"
      >
        <h3 className={styles.title}>Reward Custom Point</h3>

        <div className={styles.section}>
          <label className={styles.label}>Choose Custom Point Template</label>
          <select
            className={styles.select}
            value={selectedTemplateId}
            disabled={templates.length === 0 || isSubmitting}
            onChange={(event) => {
              const templateId = event.target.value;
              const template = templates.find((item) => item.id === templateId);
              setSelectedTemplateId(templateId);
              if (template && Number(points) > template.maxPoints) {
                setPoints(String(template.maxPoints));
              }
            }}
          >
            <option value="" disabled>
              {templates.length > 0 ? "Select" : "No custom point templates"}
            </option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} (Max: {template.maxPoints})
              </option>
            ))}
          </select>
        </div>

        <div className={styles.section}>
          <label className={styles.label}>Enter Points to be Rewarded</label>
          <input
            type="number"
            min="1"
            max={selectedTemplate?.maxPoints}
            className={styles.input}
            placeholder="Enter Points"
            value={points}
            onChange={(event) => setPoints(event.target.value)}
          />
          {selectedTemplate && points && !isPointsValid && (
            <p className={styles.errorText}>
              Points should be between 1 and {selectedTemplate.maxPoints}.
            </p>
          )}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={isSubmitting}
          >
            Close
          </button>
          <button
            type="button"
            className={styles.rewardButton}
            onClick={handleReward}
            disabled={!canSubmit}
          >
            {isSubmitting ? "Rewarding..." : "Reward Points"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
