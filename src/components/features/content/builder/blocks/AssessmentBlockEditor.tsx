"use client";

import { useState } from "react";
import styles from "@/styles/add-content-modal.module.css";
import QuestionModal from "@/components/features/content/QuestionModal";
import type {
  AssessmentBlock,
  AssessmentBlockTranslation,
} from "@/components/features/content/content-builder.types";
import type { Questionnaire } from "@/components/features/content/SharedContentForm";

interface AssessmentBlockEditorProps {
  block: AssessmentBlock;
  onChange: (patch: Partial<AssessmentBlock>) => void;
  /** When set, translates each question's text + options in place — questions can't be added/removed here. */
  translation?: {
    value: AssessmentBlockTranslation;
    onChange: (patch: Partial<AssessmentBlockTranslation>) => void;
  };
}

export default function AssessmentBlockEditor({
  block,
  onChange,
  translation,
}: AssessmentBlockEditorProps) {
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(
    null,
  );
  const [activeQuestionDropdown, setActiveQuestionDropdown] = useState<
    string | null
  >(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
    null,
  );

  const questions = block.questions;

  if (translation) {
    const items = translation.value.items || [];
    const updateItem = (index: number, patch: Record<string, string>) => {
      const next = [...items];
      next[index] = { ...next[index], ...patch };
      translation.onChange({ items: next });
    };
    return (
      <div>
        <label className={styles.commonLabel}>Questions</label>
        {questions.map((q, index) => {
          const item = items[index] || {};
          return (
            <div key={q.id} className={styles.questionItem} style={{ padding: "14px 16px" }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Q{index + 1}</div>
              <textarea
                className={styles.commonTextarea}
                style={{ minHeight: 60, marginBottom: 10 }}
                placeholder={q.question}
                value={item.question || ""}
                onChange={(e) => updateItem(index, { question: e.target.value })}
              />
              {(["a", "b", "c", "d"] as const).map((letter) => (
                <input
                  key={letter}
                  className={styles.commonInput}
                  style={{ marginBottom: 8 }}
                  placeholder={(q as any)[`option_${letter}`]}
                  value={(item as any)[`option_${letter}`] || ""}
                  onChange={(e) => updateItem(index, { [`option_${letter}`]: e.target.value })}
                />
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  const startAddQuestion = () => {
    setIsAddingQuestion(true);
    setEditingQuestionId(null);
  };

  const startEditQuestion = (q: Questionnaire) => {
    setEditingQuestionId(q.id);
    setIsAddingQuestion(false);
    setExpandedQuestionId(null);
  };

  const cancelQuestionEdit = () => {
    setIsAddingQuestion(false);
    setEditingQuestionId(null);
  };

  const saveQuestion = (qData: Questionnaire) => {
    if (editingQuestionId) {
      onChange({
        questions: questions.map((q) =>
          q.id === editingQuestionId ? qData : q,
        ),
      });
    } else {
      onChange({ questions: [...questions, qData] });
    }
    cancelQuestionEdit();
  };

  const deleteQuestion = (id: string) => {
    onChange({ questions: questions.filter((q) => q.id !== id) });
  };

  const editingQuestion = editingQuestionId
    ? questions.find((q) => q.id === editingQuestionId) || null
    : null;

  return (
    <div>
      <div className={styles.sectionHeader}>
        <label className={styles.commonLabel} style={{ marginBottom: 0 }}>
          Questions
        </label>
        {questions.length > 0 && (
          <span className={styles.addMoreLink} onClick={startAddQuestion}>
            Add Question
          </span>
        )}
      </div>

      <QuestionModal
        isOpen={isAddingQuestion || !!editingQuestionId}
        onClose={cancelQuestionEdit}
        onSave={saveQuestion}
        initialData={editingQuestion}
        itemNumber={questions.length + (editingQuestionId ? 0 : 1)}
      />

      {questions.map((q, i) => (
        <div
          key={q.id}
          className={
            expandedQuestionId === q.id
              ? styles.questionItemActive
              : styles.questionItem
          }
        >
          <div
            className={styles.questionHeader}
            onClick={() =>
              setExpandedQuestionId(expandedQuestionId === q.id ? null : q.id)
            }
          >
            <div className={styles.questionTitle}>
              <span>Q{i + 1}</span>
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
                className="tiptap-rendered-content"
                dangerouslySetInnerHTML={{ __html: q.question }}
              />
            </div>
            <div className={styles.questionActions}>
              <div
                className={styles.emptySquareBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveQuestionDropdown(
                    activeQuestionDropdown === q.id ? null : q.id,
                  );
                }}
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

              {activeQuestionDropdown === q.id && (
                <>
                  <div
                    style={{ position: "fixed", inset: 0, zIndex: 9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveQuestionDropdown(null);
                    }}
                  />
                  <div
                    className={styles.taskMenuDropdown}
                    style={{ top: "38px", right: "40px" }}
                  >
                    <button
                      className={styles.taskMenuItem}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveQuestionDropdown(null);
                        startEditQuestion(q);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className={styles.taskMenuItem}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveQuestionDropdown(null);
                        deleteQuestion(q.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}

              <div className={styles.chevronIcon}>
                {expandedQuestionId === q.id ? (
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
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                ) : (
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
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                )}
              </div>
            </div>
          </div>

          {expandedQuestionId === q.id && (
            <div className={styles.questionBody}>
              {(["A", "B", "C", "D"] as const).map((opt) => (
                <div key={opt} className={styles.optionRow}>
                  {q.right_answer === opt ? (
                    <div className={styles.correctCheckIcon}>
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
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                  ) : (
                    <div className={styles.emptySpaceCircle}></div>
                  )}
                  <span
                    className={
                      q.right_answer === opt ? styles.correctOption : ""
                    }
                  >
                    {(q as any)[`option_${opt.toLowerCase()}`]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {questions.length === 0 && !isAddingQuestion && (
        <div className={styles.cardSection}>
          <h4 className={styles.cardTitle}>
            Enhance learning impact by adding an assessment
          </h4>
          <p className={styles.cardDesc}>
            Use short, objective-type questions to reinforce key takeaways.
          </p>
          <button className={styles.actionBtn} onClick={startAddQuestion}>
            Add Questionnaire
          </button>
        </div>
      )}
    </div>
  );
}
