"use client";

import baseStyles from "@/styles/create-program.module.css";
import styles from "@/styles/duplicate-program.module.css";

export type CopyContentKey =
  | "knowledgeCard"
  | "goalsTemplates"
  | "habitsTemplates"
  | "resources"
  | "workbook"
  | "quotes"
  | "customPushNotification"
  | "popupNotification"
  | "certificateDesign"
  | "badgesAndPoints"
  | "programPrivacyPolicy";

export interface CopyContentState extends Record<string, boolean> {
  knowledgeCard: boolean;
  goalsTemplates: boolean;
  habitsTemplates: boolean;
  resources: boolean;
  workbook: boolean;
  quotes: boolean;
  customPushNotification: boolean;
  popupNotification: boolean;
  certificateDesign: boolean;
  badgesAndPoints: boolean;
  programPrivacyPolicy: boolean;
}

export const DEFAULT_COPY_CONTENT: CopyContentState = {
  knowledgeCard: true,
  goalsTemplates: true,
  habitsTemplates: true,
  resources: true,
  workbook: true,
  quotes: true,
  customPushNotification: true,
  popupNotification: true,
  certificateDesign: true,
  badgesAndPoints: true,
  programPrivacyPolicy: true,
};

const CONTENT_ITEMS: { key: CopyContentKey; label: string }[] = [
  { key: "knowledgeCard", label: "Knowledge Card" },
  { key: "goalsTemplates", label: "Goals Templates" },
  { key: "habitsTemplates", label: "Habits Templates" },
  { key: "resources", label: "Resources" },
  { key: "workbook", label: "Workbook" },
  { key: "quotes", label: "Quotes" },
  { key: "customPushNotification", label: "Custom Push Notification" },
  { key: "popupNotification", label: "Pop-up Notification" },
  { key: "certificateDesign", label: "Certificate Design" },
  { key: "badgesAndPoints", label: "Badges and Points" },
  { key: "programPrivacyPolicy", label: "Program Privacy Policy" },
];

interface CopyProgramContentSectionProps {
  copyContent: CopyContentState;
  onChange: (key: CopyContentKey, value: boolean) => void;
}

export function CopyProgramContentSection({
  copyContent,
  onChange,
}: CopyProgramContentSectionProps) {
  return (
    <section className={baseStyles.section}>
      <h2 className={baseStyles.sectionTitle}>Copy Other Program Content</h2>

      <label className={baseStyles.label}>
        Include or Exclude days from content schedule
      </label>

      <div className={styles.contentCardsGrid}>
        {CONTENT_ITEMS.map(({ key, label }) => {
          const isSelected = copyContent[key];
          return (
            <button
              key={key}
              type="button"
              className={`${styles.contentCard} ${isSelected ? styles.contentCardSelected : ""}`}
              onClick={() => onChange(key, !isSelected)}
            >
              <span className={styles.contentCardCheckbox}>
                {isSelected && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path
                      d="M1 4L3.5 6.5L9 1"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
