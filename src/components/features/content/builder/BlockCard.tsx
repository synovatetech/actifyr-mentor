"use client";

import { type ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import styles from "@/styles/add-content-modal.module.css";
import type { ContentBlock } from "@/components/features/content/content-builder.types";
import { COMPONENT_TYPE_LABELS } from "@/components/features/content/content-builder.types";

export interface BlockSaveStatus {
  status: "saving" | "success" | "error";
  error?: string;
}

interface BlockCardProps {
  block: ContentBlock;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onTitleChange: (title: string) => void;
  onDelete: () => void;
  /** Saves just this component. Omit to hide the per-component Save button. */
  onSave?: () => void;
  titleError?: boolean;
  disabled?: boolean;
  saveStatus?: BlockSaveStatus;
  /** Exposes the card's root node so the parent can scroll a newly added card into view. */
  innerRef?: (node: HTMLDivElement | null) => void;
  /** Shows this instead of `block.title` in the title input — used in translate mode, where the title being edited is a translation, not the English one. */
  titleOverride?: string;
  /** Hides the drag handle and delete button — structure (order, existence) can only change on the English tab. */
  structureLocked?: boolean;
  children: ReactNode;
}

function SaveStatusBadge({ status }: BlockSaveStatus) {
  if (status === "saving") {
    return (
      <div
        className={styles.spinner}
        style={{ width: 16, height: 16, borderWidth: 2 }}
        aria-label="Saving"
      />
    );
  }
  if (status === "success") {
    return (
      <span style={{ color: "#16A34A", display: "flex" }} aria-label="Saved" title="Saved">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </span>
    );
  }
  // Errors are reported via toast only — no inline badge, to avoid showing the same
  // failure in two places at once.
  return null;
}

export default function BlockCard({
  block,
  isExpanded,
  onToggleExpand,
  onTitleChange,
  onDelete,
  onSave,
  titleError = false,
  disabled = false,
  saveStatus,
  innerRef,
  titleOverride,
  structureLocked = false,
  children,
}: BlockCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        innerRef?.(node);
      }}
      style={style}
      className={`${isExpanded ? styles.blockCardActive : styles.blockCard} ${
        isDragging ? styles.blockCardDragging : ""
      }`}
    >
      <div
        className={styles.blockCardHeader}
        onClick={() => {
          if (!isExpanded) onToggleExpand();
        }}
      >
        {!disabled && !structureLocked && (
          <div
            className={styles.dragHandle}
            onClick={(e) => e.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="5" cy="3" r="1.3" />
              <circle cx="11" cy="3" r="1.3" />
              <circle cx="5" cy="8" r="1.3" />
              <circle cx="11" cy="8" r="1.3" />
              <circle cx="5" cy="13" r="1.3" />
              <circle cx="11" cy="13" r="1.3" />
            </svg>
          </div>
        )}

        <span className={styles.blockTypeBadge}>
          {COMPONENT_TYPE_LABELS[block.type]}
        </span>

        {/*
          A truly `disabled` <input> never dispatches a click event at all (the
          browser suppresses it before it can bubble anywhere), so the collapsed
          state uses `readOnly` instead — it still blocks editing but lets clicks
          through normally to expand the card. Real `disabled` (past date/trial)
          is kept separate since that case should stay fully inert.
        */}
        <input
          className={`${styles.blockCardTitleInput} ${
            titleError ? styles.blockCardTitleError : ""
          }`}
          value={titleOverride ?? block.title}
          placeholder={structureLocked ? block.title || "Component title" : "Component title"}
          disabled={disabled}
          readOnly={!isExpanded}
          onClick={(e) => {
            if (!isExpanded) {
              onToggleExpand();
              return;
            }
            e.stopPropagation();
          }}
          onChange={(e) => onTitleChange(e.target.value)}
        />

        <div className={styles.blockCardHeaderActions}>
          {saveStatus && <SaveStatusBadge {...saveStatus} />}
          {!structureLocked && (
          <button
            type="button"
            className={styles.emptySquareBtn}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            disabled={disabled}
            aria-label="Delete component"
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
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m5 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
          )}

          <div
            className={styles.chevronIcon}
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
          >
            {isExpanded ? (
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

      {isExpanded && (
        <div className={styles.blockCardBody}>
          {children}
          {onSave && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 12,
                marginTop: 20,
                paddingTop: 16,
                borderTop: "1px solid #F3F4F6",
              }}
            >
              <button
                type="button"
                className={styles.saveBtn}
                style={{ padding: "8px 20px" }}
                onClick={onSave}
                disabled={
                  disabled ||
                  saveStatus?.status === "saving" ||
                  !(titleOverride ?? block.title).trim()
                }
                title={!(titleOverride ?? block.title).trim() ? "Enter a component title first" : undefined}
              >
                {saveStatus?.status === "saving" ? "Saving..." : "Save Component"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
