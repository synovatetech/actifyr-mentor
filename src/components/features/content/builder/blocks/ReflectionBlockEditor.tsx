"use client";

import { useState } from "react";
import styles from "@/styles/add-content-modal.module.css";
import ReflectionPromptModal from "@/components/features/content/ReflectionPromptModal";
import type {
  ReflectionBlock,
  ReflectionBlockTranslation,
  ReflectionPrompt,
} from "@/components/features/content/content-builder.types";

interface ReflectionBlockEditorProps {
  block: ReflectionBlock;
  onChange: (patch: Partial<ReflectionBlock>) => void;
  /** When set, translates each prompt's text in place — prompts can't be added/removed here. */
  translation?: {
    value: ReflectionBlockTranslation;
    onChange: (patch: Partial<ReflectionBlockTranslation>) => void;
  };
}

export default function ReflectionBlockEditor({
  block,
  onChange,
  translation,
}: ReflectionBlockEditorProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const prompts = block.prompts;

  if (translation) {
    const questions = translation.value.questions || [];
    return (
      <div>
        <label className={styles.commonLabel}>Questions</label>
        {block.prompts.map((prompt, index) => (
          <div key={prompt.id} className={styles.questionItem} style={{ padding: "14px 16px" }}>
            <textarea
              className={styles.commonTextarea}
              style={{ minHeight: 60 }}
              placeholder={prompt.prompt}
              value={questions[index] || ""}
              onChange={(e) => {
                const next = [...questions];
                next[index] = e.target.value;
                translation.onChange({ questions: next });
              }}
            />
          </div>
        ))}
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
  const save = (data: ReflectionPrompt) => {
    if (editingId) {
      onChange({ prompts: prompts.map((p) => (p.id === editingId ? data : p)) });
    } else {
      onChange({ prompts: [...prompts, data] });
    }
    cancelEdit();
  };
  const remove = (id: string) => {
    onChange({ prompts: prompts.filter((p) => p.id !== id) });
  };

  const editing = editingId ? prompts.find((p) => p.id === editingId) || null : null;

  return (
    <div>
      <div className={styles.sectionHeader}>
        <label className={styles.commonLabel} style={{ marginBottom: 0 }}>
          Questions
        </label>
        {prompts.length > 0 && (
          <span className={styles.addMoreLink} onClick={startAdd}>
            Add Question
          </span>
        )}
      </div>

      <ReflectionPromptModal
        isOpen={isAdding || !!editingId}
        onClose={cancelEdit}
        onSave={save}
        initialData={editing}
        itemNumber={prompts.length + (editingId ? 0 : 1)}
      />

      {prompts.map((p, i) => (
        <div
          key={p.id}
          className={styles.questionItem}
          style={{ padding: "14px 16px", display: "flex", gap: 12 }}
        >
          <div style={{ flex: 1, fontSize: 14, color: "#374151" }}>
            <strong style={{ color: "var(--color-foreground)" }}>
              #{i + 1}
            </strong>{" "}
            {p.prompt}
            {p.minChars ? (
              <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
                Min. {p.minChars} characters
              </div>
            ) : null}
          </div>
          <div style={{ position: "relative" }}>
            <div
              className={styles.emptySquareBtn}
              onClick={() => setActiveDropdown(activeDropdown === p.id ? null : p.id)}
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
            {activeDropdown === p.id && (
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
                      startEdit(p.id);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className={styles.taskMenuItem}
                    onClick={() => {
                      setActiveDropdown(null);
                      remove(p.id);
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

      {prompts.length === 0 && !isAdding && (
        <div className={styles.cardSection}>
          <h4 className={styles.cardTitle}>Add reflection questions</h4>
          <p className={styles.cardDesc}>
            Open-ended, scenario-based questions learners answer in their own
            words.
          </p>
          <button className={styles.actionBtn} onClick={startAdd}>
            Add Question
          </button>
        </div>
      )}
    </div>
  );
}
