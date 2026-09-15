"use client";

import { useState } from "react";
import styles from "@/styles/add-content-modal.module.css";
import {
  COMPONENT_TYPE_REGISTRY,
  type ContentBlockType,
} from "@/components/features/content/content-builder.types";

interface AddComponentPickerProps {
  existingTypes: ContentBlockType[];
  onSelect: (type: ContentBlockType) => void;
  disabled?: boolean;
  /** Which side the trigger's left/right edge the dropdown menu anchors to — use "right" when the trigger sits near the right edge of its container (e.g. a footer). */
  align?: "left" | "right";
  /** "primary" (default) is the filled CTA used for the big empty-state prompt. "secondary" is an outline button for a persistent footer control that shouldn't visually compete with the rest of the chrome. */
  variant?: "primary" | "secondary";
}

export default function AddComponentPicker({
  existingTypes,
  onSelect,
  disabled = false,
  align = "left",
  variant = "primary",
}: AddComponentPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasComponents = existingTypes.length > 0;

  return (
    <div className={styles.addComponentWrapper}>
      <button
        type="button"
        className={variant === "secondary" ? styles.addComponentTriggerSecondary : styles.addComponentTrigger}
        onClick={() => setIsOpen((v) => !v)}
        disabled={disabled}
      >
        <span aria-hidden="true">+</span>{" "}
        {hasComponents ? "Add More Component" : "Add Component"}
      </button>

      {isOpen && (
        <>
          <div
            className={styles.componentPickerOverlay}
            onClick={() => setIsOpen(false)}
          />
          <div
            className={styles.componentPickerMenu}
            style={align === "right" ? { bottom: "48px", right: 0 } : { bottom: "48px", left: 0 }}
          >
            {COMPONENT_TYPE_REGISTRY.map((meta) => {
              const isDisabled = meta.singleton && existingTypes.includes(meta.type);
              return (
                <div
                  key={meta.type}
                  className={
                    isDisabled
                      ? styles.componentPickerItemDisabled
                      : styles.componentPickerItem
                  }
                  title={
                    isDisabled
                      ? "Only one Virtual Meeting per day"
                      : undefined
                  }
                  onClick={() => {
                    if (isDisabled) return;
                    onSelect(meta.type);
                    setIsOpen(false);
                  }}
                >
                  <span className={styles.componentPickerItemLabel}>
                    {meta.label}
                  </span>
                  <span className={styles.componentPickerItemDesc}>
                    {meta.description}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
