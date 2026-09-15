"use client";

import styles from "@/styles/add-content-modal.module.css";
import type {
  ResourceBlock,
  ResourceBlockTranslation,
  ResourceItem,
} from "@/components/features/content/content-builder.types";

interface ResourceBlockEditorProps {
  block: ResourceBlock;
  onChange: (patch: Partial<ResourceBlock>) => void;
  /** When set, translates each resource's label (and file, for file-type resources) in place — resources can't be added/removed here. */
  translation?: { value: ResourceBlockTranslation; onChange: (patch: Partial<ResourceBlockTranslation>) => void };
}

// Prefixed so a locally-generated id can never look like a real (numeric) server id —
// the update payload's id-based reconcile relies on that distinction.
const genId = () => `tmp_${Math.random().toString(36).substr(2, 9)}`;

export default function ResourceBlockEditor({
  block,
  onChange,
  translation,
}: ResourceBlockEditorProps) {
  const items = block.items;

  if (translation) {
    const tItems = translation.value.items;
    return (
      <div>
        <label className={styles.commonLabel}>Resources</label>
        {items.map((item, index) => {
          const entry = tItems[index];
          return (
            <div key={item.id} className={styles.resourceCard} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>
                {item.type === "url" ? item.value : item.label || "File resource"}
              </div>
              <input
                className={styles.resourceLabelInput}
                placeholder={item.label}
                value={entry?.label || ""}
                onChange={(e) => {
                  const next = [...tItems];
                  next[index] = { ...next[index], label: e.target.value };
                  translation.onChange({ items: next });
                }}
              />
              {item.type === "file" && (
                <input
                  type="file"
                  style={{ marginTop: 8 }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const next = [...tItems];
                    next[index] = { ...next[index], hasNewFile: true, file };
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

  const addItem = () => {
    onChange({
      items: [
        ...items,
        {
          id: genId(),
          type: "file",
          label: "",
          value: "",
          isDownloadable: false,
          addToResourcesPage: false,
        },
      ],
    });
  };

  const updateItem = (index: number, patch: Partial<ResourceItem>) => {
    onChange({
      items: items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });
  };

  const removeItem = (index: number) => {
    onChange({ items: items.filter((_, i) => i !== index) });
  };

  return (
    <div>
      <div className={styles.sectionHeader} style={{ marginBottom: "16px" }}>
        <label className={styles.commonLabel} style={{ marginBottom: 0 }}>
          Resources{" "}
          <span style={{ fontWeight: 400, color: "#6B7280" }}>
            [Add multiple files and URLs]
          </span>
        </label>
        <span className={styles.addMoreLink} onClick={addItem}>
          Add more
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {items.map((item, index) => (
          <div key={item.id} className={styles.resourceCard}>
            <div className={styles.resourceRowHeader}>
              <span
                className={styles.removeResourceIcon}
                onClick={() => removeItem(index)}
              >
                ✕
              </span>
            </div>
            <div className={styles.resourceMainRow}>
              <div className={styles.resourceTypeDropdownWrapper}>
                <select
                  className={styles.resourceTypeSelect}
                  value={item.type}
                  onChange={(e) =>
                    updateItem(index, {
                      type: e.target.value as "url" | "file",
                    })
                  }
                >
                  <option value="file">Add File</option>
                  <option value="url">Add URL</option>
                </select>
              </div>

              <div className={styles.resourceValueInputArea}>
                {item.type === "file" ? (
                  <div className={styles.fileInputContainer}>
                    <div
                      className={styles.fileInputDisplay}
                      onClick={() =>
                        document.getElementById(`resource-block-file-${item.id}`)?.click()
                      }
                    >
                      {item.file || item.existingFileUrl ? (
                        <span className={styles.selectedFileName}>
                          {item.file?.name || item.label || "File attached"}
                        </span>
                      ) : (
                        <span style={{ color: "#9CA3AF" }}>
                          Click to browse & add file (PDF, JPEG or PNG)
                        </span>
                      )}
                    </div>
                    <input
                      id={`resource-block-file-${item.id}`}
                      type="file"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) updateItem(index, { file });
                      }}
                    />
                    <button
                      type="button"
                      className={styles.resourceBrowseBtn}
                      onClick={() =>
                        document.getElementById(`resource-block-file-${item.id}`)?.click()
                      }
                    >
                      Browse
                    </button>
                  </div>
                ) : (
                  <input
                    className={styles.resourceURLInput}
                    placeholder="https://..."
                    value={item.value}
                    onChange={(e) => updateItem(index, { value: e.target.value })}
                  />
                )}
              </div>
            </div>

            <div className={styles.resourceOptionsRow}>
              <div className={styles.resourceLabelInputWrapper}>
                <input
                  className={styles.resourceLabelInput}
                  placeholder="Add resource label"
                  value={item.label}
                  onChange={(e) => updateItem(index, { label: e.target.value })}
                />
              </div>
              <div className={styles.resourceFlags}>
                <label className={styles.resourceCheckboxLabel}>
                  <input
                    type="checkbox"
                    className={styles.orangeCheckbox}
                    checked={item.addToResourcesPage}
                    onChange={(e) =>
                      updateItem(index, { addToResourcesPage: e.target.checked })
                    }
                  />
                  Add to Resources Page
                  <span className={styles.infoCircle}>i</span>
                </label>
                {item.type === "file" && (
                  <label className={styles.resourceCheckboxLabel}>
                    <input
                      type="checkbox"
                      className={styles.orangeCheckbox}
                      checked={item.isDownloadable}
                      onChange={(e) =>
                        updateItem(index, { isDownloadable: e.target.checked })
                      }
                    />
                    Downloadable
                  </label>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className={styles.cardSection}>
          <h4 className={styles.cardTitle}>Add resources for this content</h4>
          <p className={styles.cardDesc}>
            Attach reference links or downloadable files (PDF, JPEG, PNG).
          </p>
          <button className={styles.actionBtn} onClick={addItem}>
            Add Resource
          </button>
        </div>
      )}
    </div>
  );
}
