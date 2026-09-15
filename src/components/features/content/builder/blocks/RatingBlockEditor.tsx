"use client";

import { useState } from "react";
import styles from "@/styles/add-content-modal.module.css";
import RatingModal from "@/components/features/content/RatingModal";
import type {
  RatingBlock,
  RatingBlockTranslation,
  RatingQuestion,
} from "@/components/features/content/content-builder.types";

interface RatingBlockEditorProps {
  block: RatingBlock;
  onChange: (patch: Partial<RatingBlock>) => void;
  /** When set, translates each question's text + scale labels in place — questions can't be added/removed here. */
  translation?: { value: RatingBlockTranslation; onChange: (patch: Partial<RatingBlockTranslation>) => void };
}

export default function RatingBlockEditor({
  block,
  onChange,
  translation,
}: RatingBlockEditorProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const questions = block.questions;

  if (translation) {
    const items = translation.value.items;
    return (
      <div>
        <label className={styles.commonLabel}>Questions</label>
        {questions.map((q, index) => {
          const entry = items[index];
          const labels = entry?.labels || [];
          return (
            <div key={q.id} className={styles.questionItem} style={{ padding: "14px 16px" }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>
                Q{index + 1}
              </div>
              <textarea
                className={styles.commonTextarea}
                style={{ minHeight: 60, marginBottom: 10 }}
                placeholder={q.question}
                value={entry?.question || ""}
                onChange={(e) => {
                  const next = [...items];
                  next[index] = { ...next[index], question: e.target.value };
                  translation.onChange({ items: next });
                }}
              />
              <div className={styles.scaleLabelGrid}>
                {q.labels.map((englishLabel, i) => (
                  <div key={i} className={styles.scaleLabelCell}>
                    <span className={styles.scaleLabelCellNumber}>{i + 1}</span>
                    <input
                      className={styles.scaleLabelInputCompact}
                      placeholder={englishLabel}
                      value={labels[i] || ""}
                      onChange={(e) => {
                        const nextLabels = [...labels];
                        nextLabels[i] = e.target.value;
                        const next = [...items];
                        next[index] = { ...next[index], labels: nextLabels };
                        translation.onChange({ items: next });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const startAdd = () => {
    setIsAdding(true);
    setEditingId(null);
  };
  const startEdit = (id: string) => {
    setEditingId(id);
    setIsAdding(false);
  };
  const cancelEdit = () => {
    setIsAdding(false);
    setEditingId(null);
  };
  const save = (data: RatingQuestion) => {
    if (editingId) {
      onChange({
        questions: questions.map((q) => (q.id === editingId ? data : q)),
      });
    } else {
      onChange({ questions: [...questions, data] });
    }
    cancelEdit();
  };
  const remove = (id: string) => {
    onChange({ questions: questions.filter((q) => q.id !== id) });
  };

  const editing = editingId
    ? questions.find((q) => q.id === editingId) || null
    : null;

  return (
    <div>
      <div className={styles.sectionHeader}>
        <label className={styles.commonLabel} style={{ marginBottom: 0 }}>
          Questions
        </label>
        {questions.length > 0 && (
          <span className={styles.addMoreLink} onClick={startAdd}>
            Add Question
          </span>
        )}
      </div>

      {/* Each question carries its own scale (points + labels), set inside this modal. */}
      <RatingModal
        isOpen={isAdding || !!editingId}
        onClose={cancelEdit}
        onSave={save}
        initialData={editing}
        itemNumber={questions.length + (editingId ? 0 : 1)}
      />

      {questions.map((q, i) => (
        <div
          key={q.id}
          className={styles.questionItem}
          style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}
        >
          <div style={{ flex: 1, fontSize: 14, color: "#374151" }}>
            <strong style={{ color: "var(--color-foreground)" }}>
              #{i + 1}
            </strong>{" "}
            {q.question}
          </div>
          <div style={{ position: "relative" }}>
            <div
              className={styles.emptySquareBtn}
              onClick={() => setActiveDropdown(activeDropdown === q.id ? null : q.id)}
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
            {activeDropdown === q.id && (
              <>
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 9 }}
                  onClick={() => setActiveDropdown(null)}
                />
                <div className={styles.taskMenuDropdown} style={{ top: "38px", right: 0 }}>
                  <button
                    className={styles.taskMenuItem}
                    onClick={() => {
                      setActiveDropdown(null);
                      startEdit(q.id);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className={styles.taskMenuItem}
                    onClick={() => {
                      setActiveDropdown(null);
                      remove(q.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ))}

      {questions.length === 0 && !isAdding && (
        <div className={styles.cardSection}>
          <h4 className={styles.cardTitle}>Add a rating question</h4>
          <p className={styles.cardDesc}>
            Scaled self-report questions for confidence, agreement, or
            self-assessment — each with its own point scale and labels.
          </p>
          <button className={styles.actionBtn} onClick={startAdd}>
            Add Question
          </button>
        </div>
      )}
    </div>
  );
}
