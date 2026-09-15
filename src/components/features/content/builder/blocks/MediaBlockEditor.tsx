"use client";

import { useState } from "react";
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
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import styles from "@/styles/add-content-modal.module.css";
import AddMediaItemModal from "@/components/features/content/AddMediaItemModal";
import MediaPreviewModal from "@/components/features/content/MediaPreviewModal";
import type {
  MediaBlock,
  MediaBlockTranslation,
  MediaPlaylistItem,
} from "@/components/features/content/content-builder.types";
import type { MediaItem } from "@/components/features/content/content.types";
import { DEFAULT_AUDIO_THUMBNAIL } from "@/constants";

interface MediaBlockEditorProps {
  block: MediaBlock;
  onChange: (patch: Partial<MediaBlock>) => void;
  /** When set, lets each English item's dubbed file be uploaded for this language — items can't be added/removed here. */
  translation?: { value: MediaBlockTranslation; onChange: (patch: Partial<MediaBlockTranslation>) => void };
}

function toPreviewItem(item: MediaPlaylistItem): MediaItem {
  return {
    id: item.id,
    type: item.mediaType,
    name: item.name,
    path: item.path || item.previewUrl,
    previewUrl: item.previewUrl,
    thumbnail_path: item.thumbnail_path || item.thumbnailDataUrl,
  };
}

function MediaItemCard({
  item,
  onRemove,
  onPreview,
  onEdit,
}: {
  item: MediaPlaylistItem;
  onRemove: () => void;
  onPreview: () => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const thumb =
    item.thumbnail_path ||
    item.thumbnailDataUrl ||
    (item.mediaType === "audio" ? DEFAULT_AUDIO_THUMBNAIL : undefined);

  return (
    <div ref={setNodeRef} style={style} className={styles.mediaItemContainer}>
      <div className={styles.mediaCard} onClick={onPreview} {...attributes} {...listeners}>
        <div
          className={`${styles.mediaThumbnailPlaceholder} ${
            thumb ? styles.mediaThumbnailWithImage : ""
          }`}
          style={{ backgroundImage: thumb ? `url(${thumb})` : undefined }}
        >
          {item.mediaType === "video" && (
            <div className={styles.playIconCircle}>▶</div>
          )}
        </div>
        <button
          type="button"
          className={styles.editMediaBtn}
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          ✎
        </button>
        <button
          type="button"
          className={styles.removeMediaBtn}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default function MediaBlockEditor({ block, onChange, translation }: MediaBlockEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);

  const items = block.items;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (translation) {
    const translatedItems = translation.value.items;
    return (
      <div>
        <label className={styles.commonLabel}>Dubbed media</label>
        {items.map((item, index) => {
          const entry = translatedItems[index];
          return (
            <div key={item.id} className={styles.cardSection} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 14, marginBottom: 8 }}>{item.name || `Item ${index + 1}`}</div>
              <input
                type="file"
                accept="video/*,audio/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const next = [...translatedItems];
                  next[index] = { hasNewFile: true, file };
                  translation.onChange({ items: next });
                }}
              />
              {entry?.file && (
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 6 }}>
                  {entry.file.name}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange({
      items: arrayMove(items, oldIndex, newIndex).map(
        (it: MediaPlaylistItem, i: number) => ({ ...it, order: i }),
      ),
    });
  };

  const startEditItem = (id: string) => {
    setEditingItemId(id);
    setIsAdding(false);
  };

  const cancelItemEdit = () => {
    setIsAdding(false);
    setEditingItemId(null);
  };

  const saveItem = (item: MediaPlaylistItem) => {
    if (editingItemId) {
      onChange({ items: items.map((i) => (i.id === editingItemId ? item : i)) });
    } else {
      onChange({ items: [...items, { ...item, order: items.length }] });
    }
    cancelItemEdit();
  };

  const removeItem = (id: string) => {
    onChange({ items: items.filter((i) => i.id !== id) });
  };

  const editingItem = editingItemId ? items.find((i) => i.id === editingItemId) || null : null;

  return (
    <div>
      <div className={styles.sectionHeader}>
        <label className={styles.commonLabel} style={{ marginBottom: 0 }}>
          Media Items
        </label>
        {items.length > 0 && (
          <button className={styles.uploadMediaBtn} onClick={() => setIsAdding(true)}>
            Add Media
          </button>
        )}
      </div>

      <AddMediaItemModal
        isOpen={isAdding || !!editingItemId}
        onClose={cancelItemEdit}
        onSave={saveItem}
        initialData={editingItem}
      />

      {items.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className={styles.mediaGrid}>
              {items.map((item) => (
                <MediaItemCard
                  key={item.id}
                  item={item}
                  onRemove={() => removeItem(item.id)}
                  onPreview={() => setPreviewItem(toPreviewItem(item))}
                  onEdit={() => startEditItem(item.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className={styles.cardSection}>
          <h4 className={styles.cardTitle}>Add audio or video</h4>
          <p className={styles.cardDesc}>
            Upload files or link YouTube/Vimeo/direct media — mix multiple
            items into one playlist-style section.
          </p>
          <button className={styles.actionBtn} onClick={() => setIsAdding(true)}>
            Add Media
          </button>
        </div>
      )}

      <MediaPreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
    </div>
  );
}
