"use client";

import styles from "@/styles/add-content-modal.module.css";
import type {
  VirtualMeetingBlock,
  VirtualMeetingBlockTranslation,
} from "@/components/features/content/content-builder.types";

interface VirtualMeetingBlockEditorProps {
  block: VirtualMeetingBlock;
  onChange: (patch: Partial<VirtualMeetingBlock>) => void;
  translation?: {
    value: VirtualMeetingBlockTranslation;
    onChange: (patch: Partial<VirtualMeetingBlockTranslation>) => void;
  };
}

export default function VirtualMeetingBlockEditor({
  block,
  onChange,
  translation,
}: VirtualMeetingBlockEditorProps) {
  if (translation) {
    return (
      <div className={styles.sectionDescription}>
        The title above is the only translatable part of a live session — its time and join link are the same for
        every language.
      </div>
    );
  }

  return (
    <div>
      <div className={styles.sectionDescription} style={{ marginBottom: 16 }}>
        Schedule a live session for this day. Learners will see a Join button
        that activates shortly before the meeting starts.
      </div>

      <div className={styles.inputGroup} style={{ marginBottom: 20 }}>
        <input
          type="url"
          className={styles.textInput}
          placeholder="https://meet.google.com/..."
          value={block.url}
          onChange={(e) => onChange({ url: e.target.value })}
        />
      </div>

      <div className={styles.timeInputs}>
        <select
          className={styles.selectInput}
          value={block.hour}
          onChange={(e) => onChange({ hour: e.target.value })}
        >
          {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => (
            <option key={h} value={h}>
              {h.toString().padStart(2, "0")}
            </option>
          ))}
        </select>
        <select
          className={styles.selectInput}
          value={block.minute}
          onChange={(e) => onChange({ minute: e.target.value })}
        >
          {["00", "15", "30", "45"].map((val) => (
            <option key={val} value={val}>
              {val}
            </option>
          ))}
        </select>
        <select
          className={styles.selectInput}
          value={block.ampm}
          onChange={(e) => onChange({ ampm: e.target.value as "AM" | "PM" })}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
}
