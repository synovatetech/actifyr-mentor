"use client";

import { useState } from "react";
import styles from "@/styles/add-content-modal.module.css";
import AudioResponseModal from "@/components/features/content/AudioResponseModal";
import type {
  AudioResponseBlock,
  AudioResponseBlockTranslation,
  AudioResponsePrompt,
} from "@/components/features/content/content-builder.types";

interface AudioResponseBlockEditorProps {
  block: AudioResponseBlock;
  onChange: (patch: Partial<AudioResponseBlock>) => void;
  /** When set, translates each prompt's instruction text in place — prompts can't be added/removed here. */
  translation?: {
    value: AudioResponseBlockTranslation;
    onChange: (patch: Partial<AudioResponseBlockTranslation>) => void;
  };
}

export default function AudioResponseBlockEditor({
  block,
  onChange,
  translation,
}: AudioResponseBlockEditorProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const prompts = block.prompts;

  if (translation) {
    const translatedPrompts = translation.value.prompts || [];
    return (
      <div>
        <label className={styles.commonLabel}>Questions</label>
        {block.prompts.map((prompt, index) => (
          <div key={prompt.id} className={styles.questionItem} style={{ padding: "14px 16px" }}>
            <textarea
              className={styles.commonTextarea}
              style={{ minHeight: 60 }}
              placeholder={prompt.instruction}
              value={translatedPrompts[index] || ""}
              onChange={(e) => {
                const next = [...translatedPrompts];
                next[index] = e.target.value;
                translation.onChange({ prompts: next });
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
  const save = (data: AudioResponsePrompt) => {
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

      <AudioResponseModal
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
            {p.instruction}
            <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
              Max duration: 5:00 (fixed)
            </div>
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
          <h4 className={styles.cardTitle}>Add an audio recording question</h4>
          <p className={styles.cardDesc}>
            Learners respond by recording their voice — great for
            communication, prayer, pitches, or verbal reflection.
          </p>
          <button className={styles.actionBtn} onClick={startAdd}>
            Add Question
          </button>
        </div>
      )}
    </div>
  );
}
