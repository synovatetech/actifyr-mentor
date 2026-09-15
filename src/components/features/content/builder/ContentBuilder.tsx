"use client";

import { useState, useEffect, useRef } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import styles from "@/styles/add-content-modal.module.css";
import ConfirmCloseModal from "@/components/common/ConfirmCloseModal";
import BlockCard, {
  type BlockSaveStatus,
} from "@/components/features/content/builder/BlockCard";
import AddComponentPicker from "@/components/features/content/builder/AddComponentPicker";
import TextBlockEditor from "@/components/features/content/builder/blocks/TextBlockEditor";
import MediaBlockEditor from "@/components/features/content/builder/blocks/MediaBlockEditor";
import AssessmentBlockEditor from "@/components/features/content/builder/blocks/AssessmentBlockEditor";
import TasksBlockEditor from "@/components/features/content/builder/blocks/TasksBlockEditor";
import ResourceBlockEditor from "@/components/features/content/builder/blocks/ResourceBlockEditor";
import PollBlockEditor from "@/components/features/content/builder/blocks/PollBlockEditor";
import ReflectionBlockEditor from "@/components/features/content/builder/blocks/ReflectionBlockEditor";
import TrueFalseBlockEditor from "@/components/features/content/builder/blocks/TrueFalseBlockEditor";
import RatingBlockEditor from "@/components/features/content/builder/blocks/RatingBlockEditor";
import VirtualMeetingBlockEditor from "@/components/features/content/builder/blocks/VirtualMeetingBlockEditor";
import AudioResponseBlockEditor from "@/components/features/content/builder/blocks/AudioResponseBlockEditor";
import {
  createDefaultBlock,
  COMPONENT_TYPE_LABELS,
  type ContentBlock,
  type ContentBlockType,
} from "@/components/features/content/content-builder.types";

interface ContentBuilderProps {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  isPastDate?: boolean;
  /** Per-block save status (keyed by block id), shown live while saving. */
  blockStatuses?: Record<string, BlockSaveStatus>;
  /** Saves just this component — shows a per-component Save button when provided.
   * Return `false` to indicate the save failed and keep the card expanded; any
   * other result (including void) collapses the card. */
  onSaveBlock?: (block: ContentBlock) => Promise<boolean | void> | boolean | void;
  /** Deletes an already-persisted component immediately. Falls back to local-only removal when omitted. */
  onDeleteBlock?: (block: ContentBlock) => void;
  /** Persists a drag-reorder immediately. Falls back to local-only reordering when omitted. */
  onReorder?: (blocks: ContentBlock[]) => void;
  /** Runs before a new component is added — e.g. to create the content shell on demand the first time. Resolving `false` aborts the add. */
  onBeforeAddBlock?: () => Promise<boolean> | boolean;
  /** True until the content shell has been saved — components can't exist without a content id yet. */
  locked?: boolean;
  lockedMessage?: string;
  /** Suppresses this component's own "Add Component" trigger — use when the parent renders a single external one instead (e.g. a footer CTA that also handles the initial content-shell save). */
  hideAddComponentButton?: boolean;
  /** "en" (or omitted) renders normal English authoring. Any other language code switches every block into translate mode: structural controls (add/delete/reorder/add-item) hide, and each block editor renders translated text/file fields instead — only meaningful together with `onChangeTranslation`. */
  activeLanguage?: string;
  /** Patches `block.translations[languageCode]` for one block — required to actually edit translations when `activeLanguage` isn't English. */
  onChangeTranslation?: (blockId: string, languageCode: string, patch: Record<string, any>) => void;
}

export default function ContentBuilder({
  blocks,
  onChange,
  isPastDate = false,
  blockStatuses,
  onSaveBlock,
  onDeleteBlock,
  onReorder,
  onBeforeAddBlock,
  locked = false,
  lockedMessage = "Save the content details above to start adding components.",
  hideAddComponentButton = false,
  activeLanguage = "en",
  onChangeTranslation,
}: ContentBuilderProps) {
  const isTranslating = activeLanguage !== "en";
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Auto-expand and scroll to a newly added block. Detected off the `blocks` prop
  // itself (rather than the local addBlock() below) so this also covers callers
  // that append a block from outside this component, e.g. AddContentModal's
  // external footer "Add Component" picker.
  const blockNodesRef = useRef<Record<string, HTMLDivElement | null>>({});
  const knownBlockIdsRef = useRef<Set<string>>(new Set(blocks.map((b) => b.id)));
  const pendingScrollIdRef = useRef<string | null>(null);
  useEffect(() => {
    const newBlocks = blocks.filter((b) => !knownBlockIdsRef.current.has(b.id));
    knownBlockIdsRef.current = new Set(blocks.map((b) => b.id));
    // Only a genuine single "Add Component" click should auto-expand — a bulk load
    // (e.g. CSV import creating several components at once) surfaces many new ids
    // together and shouldn't jump straight into the first one.
    if (newBlocks.length === 1) {
      setExpandedBlockId(newBlocks[0].id);
      pendingScrollIdRef.current = newBlocks[0].id;
    }
  }, [blocks]);

  // Wait for `expandedBlockId` to actually match before scrolling — otherwise
  // this fires while the new card is still collapsed (same commit as the effect
  // above, before its setExpandedBlockId re-render lands), scrolling to just its
  // header instead of its fully expanded body.
  useEffect(() => {
    if (!pendingScrollIdRef.current || expandedBlockId !== pendingScrollIdRef.current) {
      return;
    }
    const node = blockNodesRef.current[pendingScrollIdRef.current];
    if (!node) return;
    pendingScrollIdRef.current = null;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [expandedBlockId, blocks]);

  // Auto-expand the first block that just failed to save, so the error is visible
  // without the author having to hunt for which collapsed section broke.
  const lastErrorBlockIdRef = useRef<string | null>(null);
  useEffect(() => {
    const erroredBlock = blocks.find((b) => blockStatuses?.[b.id]?.status === "error");
    if (erroredBlock && erroredBlock.id !== lastErrorBlockIdRef.current) {
      lastErrorBlockIdRef.current = erroredBlock.id;
      setExpandedBlockId(erroredBlock.id);
    }
    if (!erroredBlock) lastErrorBlockIdRef.current = null;
  }, [blocks, blockStatuses]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const updateBlock = (id: string, patch: Record<string, any>) => {
    onChange(
      blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as ContentBlock) : b)),
    );
  };

  const setBlockTitle = (id: string, title: string) => {
    updateBlock(id, { title });
  };

  const addBlock = async (type: ContentBlockType) => {
    if (onBeforeAddBlock) {
      const ok = await onBeforeAddBlock();
      if (!ok) return;
    }
    const newBlock = createDefaultBlock(type, blocks.length);
    onChange([...blocks, newBlock]);
  };

  const removeBlock = (id: string) => {
    const block = blocks.find((b) => b.id === id);
    if (expandedBlockId === id) setExpandedBlockId(null);
    setPendingDeleteId(null);
    if (!block) return;
    if (onDeleteBlock) {
      onDeleteBlock(block);
    } else {
      onChange(
        blocks.filter((b) => b.id !== id).map((b, i) => ({ ...b, order: i })),
      );
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(blocks, oldIndex, newIndex).map(
      (b: ContentBlock, i: number) => ({ ...b, order: i }),
    );
    if (onReorder) {
      onReorder(reordered);
    } else {
      onChange(reordered);
    }
  };

  const renderBlockEditor = (block: ContentBlock) => {
    const onChangePatch = (patch: Record<string, any>) =>
      updateBlock(block.id, patch);

    // Translate mode: every editor gets the same { value, onChange } shape instead of
    // rendering its English (structural) body — value defaults to `{}` so an editor
    // never has to null-check a language that hasn't been touched yet.
    const translation =
      isTranslating && onChangeTranslation
        ? {
            value: (block as any).translations?.[activeLanguage] ?? {},
            onChange: (patch: Record<string, any>) =>
              onChangeTranslation(block.id, activeLanguage, patch),
          }
        : undefined;

    switch (block.type) {
      case "text":
        return <TextBlockEditor block={block} onChange={onChangePatch} translation={translation} />;
      case "media":
        return <MediaBlockEditor block={block} onChange={onChangePatch} translation={translation} />;
      case "assessment":
        return <AssessmentBlockEditor block={block} onChange={onChangePatch} translation={translation} />;
      case "tasks":
        return <TasksBlockEditor block={block} onChange={onChangePatch} translation={translation} />;
      case "resource":
        return <ResourceBlockEditor block={block} onChange={onChangePatch} translation={translation} />;
      case "poll":
        return <PollBlockEditor block={block} onChange={onChangePatch} translation={translation} />;
      case "reflection":
        return <ReflectionBlockEditor block={block} onChange={onChangePatch} translation={translation} />;
      case "true_false":
        return <TrueFalseBlockEditor block={block} onChange={onChangePatch} translation={translation} />;
      case "rating":
        return <RatingBlockEditor block={block} onChange={onChangePatch} translation={translation} />;
      case "virtual_meeting":
        return (
          <VirtualMeetingBlockEditor block={block} onChange={onChangePatch} translation={translation} />
        );
      case "audio_response":
        return (
          <AudioResponseBlockEditor block={block} onChange={onChangePatch} translation={translation} />
        );
      default:
        return null;
    }
  };

  const pendingDeleteBlock = pendingDeleteId
    ? blocks.find((b) => b.id === pendingDeleteId)
    : null;

  if (locked) {
    return (
      <div className={styles.emptyBuilderState}>
        <h4 className={styles.cardTitle}>Components locked</h4>
        <p className={styles.cardDesc} style={{ marginBottom: 0 }}>
          {lockedMessage}
        </p>
      </div>
    );
  }

  return (
    <div>
      {blocks.length === 0 ? (
        isTranslating ? (
          <div className={styles.addComponentEmptyRow}>
            <p className={styles.addComponentHelperText}>
              No components to translate yet — add components on the English tab first.
            </p>
          </div>
        ) : (
          !isPastDate &&
          !hideAddComponentButton && (
            <div className={styles.addComponentEmptyRow}>
              <p className={styles.addComponentHelperText}>
                Build your day&apos;s content by adding one or more components.
                Each component represents a learning element such as text,
                media, assessment, poll, and many others.
              </p>
              <AddComponentPicker existingTypes={[]} onSelect={addBlock} />
            </div>
          )
        )
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={blocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className={styles.blockList}>
                {blocks.map((block) => (
                  <BlockCard
                    key={block.id}
                    block={block}
                    innerRef={(node) => {
                      blockNodesRef.current[block.id] = node;
                    }}
                    isExpanded={expandedBlockId === block.id}
                    onToggleExpand={() =>
                      setExpandedBlockId(
                        expandedBlockId === block.id ? null : block.id,
                      )
                    }
                    onTitleChange={
                      isTranslating
                        ? (title) => onChangeTranslation?.(block.id, activeLanguage, { title })
                        : (title) => setBlockTitle(block.id, title)
                    }
                    titleOverride={
                      isTranslating ? (block as any).translations?.[activeLanguage]?.title ?? "" : undefined
                    }
                    onDelete={() => setPendingDeleteId(block.id)}
                    onSave={
                      onSaveBlock
                        ? async () => {
                            const result = await onSaveBlock(block);
                            if (result !== false) setExpandedBlockId(null);
                          }
                        : undefined
                    }
                    titleError={!isTranslating && !block.title.trim()}
                    disabled={isPastDate}
                    structureLocked={isTranslating}
                    saveStatus={blockStatuses?.[block.id]}
                  >
                    {renderBlockEditor(block)}
                  </BlockCard>
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {!isPastDate && !hideAddComponentButton && !isTranslating && (
            <div className={styles.addComponentRow}>
              <AddComponentPicker
                existingTypes={blocks.map((b) => b.type)}
                onSelect={addBlock}
              />
            </div>
          )}
        </>
      )}

      {pendingDeleteBlock && (
        <ConfirmCloseModal
          title={`Delete ${COMPONENT_TYPE_LABELS[pendingDeleteBlock.type].toLowerCase()} component`}
          message={`This will permanently delete the "${pendingDeleteBlock.title}" component. This action cannot be undone.`}
          confirmText="Delete component"
          cancelText="Cancel"
          showDeleteIcon
          onConfirm={() => removeBlock(pendingDeleteBlock.id)}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </div>
  );
}
