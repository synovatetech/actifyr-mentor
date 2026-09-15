"use client";

import { useState } from "react";
import styles from "@/styles/add-content-modal.module.css";
import TaskModal from "@/components/features/content/TaskModal";
import type { TasksBlock, TasksBlockTranslation } from "@/components/features/content/content-builder.types";
import type { Task } from "@/components/features/content/SharedContentForm";

interface TasksBlockEditorProps {
  block: TasksBlock;
  onChange: (patch: Partial<TasksBlock>) => void;
  /** When set, translates each task's text (and attachment) in place — tasks can't be added/removed here. */
  translation?: { value: TasksBlockTranslation; onChange: (patch: Partial<TasksBlockTranslation>) => void };
}

export default function TasksBlockEditor({
  block,
  onChange,
  translation,
}: TasksBlockEditorProps) {
  const [activeTaskDropdown, setActiveTaskDropdown] = useState<string | null>(
    null,
  );
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const tasks = block.tasks;

  if (translation) {
    const items = translation.value.items;
    return (
      <div>
        <label className={styles.commonLabel}>Tasks</label>
        {tasks.map((task, index) => {
          const entry = items[index];
          return (
            <div key={task.id} className={styles.taskCard} style={{ marginBottom: 8 }}>
              <div
                className={`${styles.taskDesc} tiptap-rendered-content`}
                style={{ marginBottom: 8, opacity: 0.6 }}
                dangerouslySetInnerHTML={{ __html: task.description }}
              />
              <textarea
                className={styles.commonTextarea}
                style={{ minHeight: 60, marginBottom: 8 }}
                placeholder="Translated task text"
                value={entry?.task || ""}
                onChange={(e) => {
                  const next = [...items];
                  next[index] = { ...next[index], task: e.target.value };
                  translation.onChange({ items: next });
                }}
              />
              {(task.file || task.existingAttachmentUrl) && (
                <input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const next = [...items];
                    next[index] = { ...next[index], hasNewAttachment: true, file };
                    translation.onChange({ items: next });
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const startAddTask = () => {
    setIsAddingTask(true);
    setEditingTaskId(null);
  };

  const startEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setIsAddingTask(false);
  };

  const cancelTaskEdit = () => {
    setIsAddingTask(false);
    setEditingTaskId(null);
  };

  const saveTask = (taskData: Task) => {
    if (editingTaskId) {
      onChange({
        tasks: tasks.map((t) => (t.id === editingTaskId ? taskData : t)),
      });
    } else {
      onChange({ tasks: [...tasks, taskData] });
    }
    cancelTaskEdit();
  };

  const deleteTask = (id: string) => {
    onChange({ tasks: tasks.filter((t) => t.id !== id) });
  };

  const editingTask = editingTaskId
    ? tasks.find((t) => t.id === editingTaskId) || null
    : null;

  return (
    <div>
      <div className={styles.sectionHeader}>
        <label className={styles.commonLabel} style={{ marginBottom: 0 }}>
          Tasks
        </label>
        {tasks.length > 0 && (
          <span className={styles.addMoreLink} onClick={startAddTask}>
            Add Task
          </span>
        )}
      </div>

      <TaskModal
        isOpen={isAddingTask || !!editingTaskId}
        onClose={cancelTaskEdit}
        onSave={saveTask}
        initialData={editingTask}
        itemNumber={tasks.length + (editingTaskId ? 0 : 1)}
      />

      <div className={styles.taskList}>
        {tasks.map((t, index) => (
          <div
            key={t.id}
            className={styles.taskCard}
            onClick={() =>
              setActiveTaskDropdown(activeTaskDropdown === t.id ? null : t.id)
            }
            style={{ cursor: "pointer" }}
          >
            <div className={styles.taskHeader}>
              <span className={styles.taskTitle}>
                Task {index + 1}{" "}
                <span>
                  (
                  {(t.category || t.type || "").toLowerCase().includes("pow")
                    ? "PoW"
                    : (t.category || t.type || "").toLowerCase().includes("poi")
                      ? "PoI"
                      : (t.category || t.type || "")
                            .toLowerCase()
                            .includes("poa")
                        ? "PoA"
                        : "General"}
                  )
                </span>
              </span>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                  position: "relative",
                }}
              >
                <span className={styles.taskPoints}>{t.point} Points</span>
                <button
                  className={styles.menuDotsBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTaskDropdown(
                      activeTaskDropdown === t.id ? null : t.id,
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
                </button>

                {activeTaskDropdown === t.id && (
                  <>
                    <div
                      style={{ position: "fixed", inset: 0, zIndex: 9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTaskDropdown(null);
                      }}
                    />
                    <div
                      className={styles.taskMenuDropdown}
                      style={{ top: "28px" }}
                    >
                      <button
                        className={styles.taskMenuItem}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTaskDropdown(null);
                          startEditTask(t);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className={styles.taskMenuItem}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTaskDropdown(null);
                          deleteTask(t.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div
              className={`${styles.taskDesc} tiptap-rendered-content`}
              dangerouslySetInnerHTML={{ __html: t.description }}
            ></div>

            <div className={styles.taskFooter}>
              <div className={styles.badgeRow}>
                {t.action && t.action.length > 0 ? (
                  t.action.map((act, idx) => (
                    <span key={idx} className={styles.taskActionBadge}>
                      {act}
                    </span>
                  ))
                ) : (
                  <span className={styles.taskNoAction}>
                    No micro-actions added
                  </span>
                )}
              </div>

              {((t as any).file || (t as any).attachment) && (
                <div
                  className={styles.taskAttachmentIcon}
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                  </svg>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {tasks.length === 0 && !isAddingTask && (
        <div className={styles.cardSection}>
          <h4 className={styles.cardTitle}>Encourage learning by doing</h4>
          <p className={styles.cardDesc}>
            Add simple, action-based tasks to reinforce learning.
          </p>
          <button className={styles.actionBtn} onClick={startAddTask}>
            Add Tasks
          </button>
        </div>
      )}
    </div>
  );
}
