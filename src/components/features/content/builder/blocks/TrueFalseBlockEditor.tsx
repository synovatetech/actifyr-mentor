"use client";

import { useState } from "react";
import styles from "@/styles/add-content-modal.module.css";
import TrueFalseModal from "@/components/features/content/TrueFalseModal";
import type {
  TrueFalseBlock,
  TrueFalseBlockTranslation,
  TrueFalseStatement,
} from "@/components/features/content/content-builder.types";

interface TrueFalseBlockEditorProps {
  block: TrueFalseBlock;
  onChange: (patch: Partial<TrueFalseBlock>) => void;
  /** When set, translates each statement's text in place — statements can't be added/removed here. */
  translation?: {
    value: TrueFalseBlockTranslation;
    onChange: (patch: Partial<TrueFalseBlockTranslation>) => void;
  };
}

export default function TrueFalseBlockEditor({
  block,
  onChange,
  translation,
}: TrueFalseBlockEditorProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const statements = block.statements;

  if (translation) {
    const translatedStatements = translation.value.statements || [];
    return (
      <div>
        <label className={styles.commonLabel}>Statements</label>
        {block.statements.map((statement, index) => (
          <div key={statement.id} className={styles.questionItem} style={{ padding: "14px 16px" }}>
            <input
              className={styles.commonInput}
              placeholder={statement.statement}
              value={translatedStatements[index] || ""}
              onChange={(e) => {
                const next = [...translatedStatements];
                next[index] = e.target.value;
                translation.onChange({ statements: next });
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
  const save = (data: TrueFalseStatement) => {
    if (editingId) {
      onChange({
        statements: statements.map((s) => (s.id === editingId ? data : s)),
      });
    } else {
      onChange({ statements: [...statements, data] });
    }
    cancelEdit();
  };
  const remove = (id: string) => {
    onChange({ statements: statements.filter((s) => s.id !== id) });
  };

  const editing = editingId
    ? statements.find((s) => s.id === editingId) || null
    : null;

  return (
    <div>
      <div className={styles.sectionHeader}>
        <label className={styles.commonLabel} style={{ marginBottom: 0 }}>
          Statements
        </label>
        {statements.length > 0 && (
          <span className={styles.addMoreLink} onClick={startAdd}>
            Add Statement
          </span>
        )}
      </div>

      <TrueFalseModal
        isOpen={isAdding || !!editingId}
        onClose={cancelEdit}
        onSave={save}
        initialData={editing}
        itemNumber={statements.length + (editingId ? 0 : 1)}
      />

      {statements.map((s, i) => (
        <div
          key={s.id}
          className={styles.questionItem}
          style={{ padding: "14px 16px", display: "flex", gap: 12 }}
        >
          <div style={{ flex: 1, fontSize: 14, color: "#374151" }}>
            <strong style={{ color: "var(--color-foreground)" }}>
              #{i + 1}
            </strong>{" "}
            {s.statement}
          </div>
          <div style={{ position: "relative" }}>
            <div
              className={styles.emptySquareBtn}
              onClick={() => setActiveDropdown(activeDropdown === s.id ? null : s.id)}
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
            {activeDropdown === s.id && (
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
                      startEdit(s.id);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className={styles.taskMenuItem}
                    onClick={() => {
                      setActiveDropdown(null);
                      remove(s.id);
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

      {statements.length === 0 && !isAdding && (
        <div className={styles.cardSection}>
          <h4 className={styles.cardTitle}>Add rapid-fire true/false statements</h4>
          <p className={styles.cardDesc}>
            Quick statements learners judge as true or false.
          </p>
          <button className={styles.actionBtn} onClick={startAdd}>
            Add Statement
          </button>
        </div>
      )}
    </div>
  );
}
