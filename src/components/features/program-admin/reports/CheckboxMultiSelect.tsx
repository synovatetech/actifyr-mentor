"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "@/styles/reports.module.css";

export interface MultiSelectOption {
  value: string;
  label: string;
  /** Shown before a dash, e.g. "16 Apr 2026". "No Date" rendered lighter when null/undefined. */
  datePrefix?: string | null;
}

interface CheckboxMultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  /** When true only one item can be selected at a time. */
  singleOnly?: boolean;
  disabled?: boolean;
}

interface TooltipState {
  text: string;
  x: number;
  y: number;
}

export default function CheckboxMultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select",
  singleOnly = false,
  disabled = false,
}: CheckboxMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setTooltip(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const allSelected = options.length > 0 && selected.length === options.length;

  const toggle = (value: string) => {
    if (singleOnly) {
      onChange(selected[0] === value ? [] : [value]);
      setOpen(false);
      return;
    }
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  };

  const toggleAll = () => onChange(allSelected ? [] : options.map((o) => o.value));

  const selectedOption = selected.length === 1
    ? options.find((o) => o.value === selected[0])
    : null;

  const triggerLabel =
    selected.length === 0
      ? placeholder
      : selected.length === options.length
        ? "All"
        : selected.length === 1
          ? (selectedOption?.label ?? "1 selected")
          : `${selected.length} selected`;

  const triggerTitle =
    selected.length === 0
      ? undefined
      : selected.length === 1 && selectedOption
        ? [selectedOption.datePrefix, selectedOption.label].filter(Boolean).join(" - ")
        : selected.length === options.length
          ? undefined
          : options.filter((o) => selected.includes(o.value)).map((o) => o.label).join(", ");

  const showTooltip = (e: React.MouseEvent, text: string) => {
    const item = e.currentTarget as HTMLElement;
    const labelEl = item.querySelector(`.${styles.msLabel}`) as HTMLElement | null;
    if (!labelEl || labelEl.scrollWidth <= labelEl.offsetWidth) return;
    const rect = item.getBoundingClientRect();
    setTooltip({ text, x: rect.left, y: rect.top - 6 });
  };

  const hideTooltip = () => setTooltip(null);

  return (
    <div ref={containerRef} className={styles.msContainer}>
      <button
        type="button"
        className={`${styles.msTrigger} ${disabled ? styles.msDisabled : ""}`}
        onClick={() => !disabled && setOpen((p) => !p)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={triggerTitle}
      >
        <span className={`${styles.msTriggerLabel} ${selected.length === 0 ? styles.msPlaceholder : ""}`}>
          {triggerLabel}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className={styles.msDropdown} role="listbox" aria-multiselectable="true">
          {!singleOnly && (
            <label className={styles.msItem}>
              <span className={`${styles.msBox} ${allSelected ? styles.msBoxChecked : ""}`} aria-hidden>
                {allSelected && <CheckIcon />}
              </span>
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className={styles.msHidden} />
              <span>Select All</span>
            </label>
          )}
          {options.map((opt) => {
            const checked = selected.includes(opt.value);
            const hasDate = opt.datePrefix !== undefined;
            const fullTitle = hasDate
              ? [opt.datePrefix ?? "No Date", opt.label].join(" - ")
              : opt.label;
            return (
              <label
                key={opt.value}
                className={styles.msItem}
                onMouseEnter={(e) => showTooltip(e, fullTitle)}
                onMouseLeave={hideTooltip}
              >
                <span className={`${styles.msBox} ${checked ? styles.msBoxChecked : ""}`} aria-hidden>
                  {checked && <CheckIcon />}
                </span>
                <input type="checkbox" checked={checked} onChange={() => toggle(opt.value)} className={styles.msHidden} />
                {hasDate && (
                  <span className={opt.datePrefix ? styles.msDateLabel : styles.msNoDate}>
                    {opt.datePrefix ?? "No Date"}
                  </span>
                )}
                {hasDate && <span className={styles.msDash}> - </span>}
                <span className={styles.msLabel}>{opt.label}</span>
              </label>
            );
          })}
        </div>
      )}

      {mounted && tooltip && createPortal(
        <div
          className={styles.msTooltip}
          style={{ left: tooltip.x, top: tooltip.y, transform: "translateY(-100%)" }}
        >
          {tooltip.text}
        </div>,
        document.body,
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="10" height="9" viewBox="0 0 12 10" fill="none" aria-hidden>
      <path d="M1 5L4.5 8.5L11 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
