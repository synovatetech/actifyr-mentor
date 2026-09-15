"use client";

import styles from "@/styles/add-content-modal.module.css";
import type { PollBlock, PollBlockTranslation } from "@/components/features/content/content-builder.types";

interface PollBlockEditorProps {
  block: PollBlock;
  onChange: (patch: Partial<PollBlock>) => void;
  /** When set, translates the question + each option in place — options can't be added/removed here. */
  translation?: { value: PollBlockTranslation; onChange: (patch: Partial<PollBlockTranslation>) => void };
}

const genId = () => Math.random().toString(36).substr(2, 9);

export default function PollBlockEditor({ block, onChange, translation }: PollBlockEditorProps) {
  if (translation) {
    const options = translation.value.options || [];
    return (
      <div>
        <div className={styles.inputGroup} style={{ marginBottom: 20 }}>
          <label className={styles.commonLabel}>Poll Question</label>
          <input
            className={styles.commonInput}
            placeholder={block.question}
            value={translation.value.question || ""}
            onChange={(e) => translation.onChange({ question: e.target.value })}
          />
        </div>
        <label className={styles.commonLabel}>Options</label>
        {block.options.map((option, index) => (
          <div key={option.id} className={styles.pollOptionRow}>
            <input
              className={styles.pollOptionInput}
              placeholder={option.text}
              value={options[index] || ""}
              onChange={(e) => {
                const next = [...options];
                next[index] = e.target.value;
                translation.onChange({ options: next });
              }}
            />
          </div>
        ))}
      </div>
    );
  }
  const addOption = () => {
    if (block.options.length >= 5) return;
    onChange({ options: [...block.options, { id: genId(), text: "" }] });
  };

  const removeOption = (id: string) => {
    if (block.options.length <= 2) return;
    onChange({ options: block.options.filter((o) => o.id !== id) });
  };

  const updateOption = (id: string, text: string) => {
    onChange({
      options: block.options.map((o) => (o.id === id ? { ...o, text } : o)),
    });
  };

  return (
    <div>
      <div className={styles.inputGroup} style={{ marginBottom: 20 }}>
        <label className={styles.commonLabel}>
          Poll Question<span style={{ color: "#DC2626" }}>*</span>
        </label>
        <input
          className={styles.commonInput}
          placeholder="Enter your poll question"
          value={block.question}
          onChange={(e) => onChange({ question: e.target.value })}
        />
      </div>

      <div className={styles.sectionHeader}>
        <label className={styles.commonLabel} style={{ marginBottom: 0 }}>
          Options (2-5)
        </label>
        {block.options.length < 5 && (
          <span className={styles.addMoreLink} onClick={addOption}>
            Add option
          </span>
        )}
      </div>

      {block.options.map((option, index) => (
        <div key={option.id} className={styles.pollOptionRow}>
          <input
            className={styles.pollOptionInput}
            placeholder={`Option ${index + 1}`}
            value={option.text}
            onChange={(e) => updateOption(option.id, e.target.value)}
          />
          <button
            type="button"
            className={styles.removeOptionBtn}
            onClick={() => removeOption(option.id)}
            disabled={block.options.length <= 2}
            aria-label="Remove option"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
