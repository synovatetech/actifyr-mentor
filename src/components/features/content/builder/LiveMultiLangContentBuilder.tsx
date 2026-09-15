"use client";

import { useEffect, type ReactNode } from "react";
import { useAvailableLanguages } from "@/hooks/useAvailableLanguages";
import { useContentBuilderMissingTranslations, useContentBuilderContentForLanguage } from "@/hooks/useContentBuilder";
import { MissingTranslationIcon } from "@/components/common/icons/MissingTranslationIcon";
import ContentBuilder from "@/components/features/content/builder/ContentBuilder";
import type { useContentBuilderController } from "@/hooks/useContentBuilderController";
import { COMPONENT_TYPE_LABELS } from "@/components/features/content/content-builder.types";
import { useToast } from "@/context/ToastContext";
import langStyles from "@/styles/lang-content-tab.module.css";
import styles from "@/styles/add-content-modal.module.css";

const EN = "en";

interface LiveMultiLangContentBuilderProps {
  /** Program's selected language ids — tabs are filtered down to these. Omit to show every available language. */
  selectedLanguages?: string[];
  controller: ReturnType<typeof useContentBuilderController>;
  /** Needed to fetch a language tab's content (`?language_code=`) the first time it's opened. */
  programId?: string | number;
  titlePlaceholder?: string;
  isPastDate?: boolean;
  /** Creates the content shell on demand (first component add, or any later save) if it doesn't exist yet, and syncs the shell's fields if they've changed. Resolving `false` aborts the action that triggered it (e.g. no title yet). Pass `{silent: true}` for a background auto-save (e.g. on blur) that shouldn't toast about missing required fields. */
  ensureContentShell: (opts?: { silent?: boolean }) => Promise<boolean>;
  /** Suppresses the inline "Add Component" triggers — use when the parent renders a single external one instead (e.g. a footer CTA). */
  hideAddComponentButton?: boolean;
  /** Renders below the language tab row and above the Title field — e.g. an "Import from CSV" card that only makes sense once the admin has picked a language context. */
  afterTabsContent?: ReactNode;
  /** Fires after any save/delete that could change translation completeness (a component save, delete, or title blur) — lets the host page background-refresh whatever list/calendar shows a "missing translation" badge, without waiting for the modal to close. */
  onContentChanged?: () => void;
}

/**
 * Server-backed counterpart to `MultiLangContentBuilder` — English drives structure
 * (add/delete/reorder/add-item only work on the English tab); every other language
 * tab translates the exact same blocks and items in place, since the API requires
 * translations to line up position-for-position with English. There's no separate
 * "save details" step — typing a title and adding (or saving) a component creates
 * the content shell on the fly.
 */
export default function LiveMultiLangContentBuilder({
  selectedLanguages,
  controller,
  programId,
  titlePlaceholder = "Enter the content title",
  isPastDate,
  ensureContentShell,
  hideAddComponentButton,
  afterTabsContent,
  onContentChanged,
}: LiveMultiLangContentBuilderProps) {
  const { availableLanguages } = useAvailableLanguages();
  const activeLangTabs = availableLanguages.filter(
    (lang) => !selectedLanguages || selectedLanguages.includes(lang.id),
  );
  const { showToast } = useToast();

  const {
    contentId,
    title,
    setTitle,
    titleTranslations,
    setTitleTranslations,
    blocks,
    setBlocks,
    activeLanguage,
    setActiveLanguage,
    blockStatuses,
    saveBlock,
    deleteBlock,
    reorderBlocks,
    setBlockTranslation,
    applyLanguageContent,
  } = controller;

  // Fetches the opened language tab's content on demand — cached per language by TanStack
  // Query, so switching back to an already-visited tab doesn't refetch.
  const { data: languageContent } = useContentBuilderContentForLanguage(
    programId,
    contentId,
    activeLanguage,
    activeLanguage !== EN && !!contentId,
  );
  useEffect(() => {
    if (languageContent) applyLanguageContent(activeLanguage, languageContent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [languageContent]);

  // Authoritative — reflects what the server actually has saved for each language
  // (title, every component, every item), not just "something was typed locally".
  // `useContentBuilderController` also invalidates this query key on every save/delete,
  // but that only forces a refetch for an *active* observer — calling `refetch()`
  // ourselves right after our own save completes doesn't depend on that at all, so the
  // icons here are guaranteed to reflect the save that was just made.
  const { data: missingTranslations, refetch: refetchMissingTranslations } = useContentBuilderMissingTranslations(
    contentId,
    !!contentId && activeLangTabs.length > 0,
  );
  const isLanguageIncomplete = (langId: string) =>
    !!missingTranslations?.languages?.some((l: any) => l.language_code === langId && !l.is_complete);

  // Translations ride inline on a component's own save request — with no English
  // component saved yet there's nothing for a translation to attach to, so language
  // tabs stay disabled until at least one exists.
  const hasSavedComponent = blocks.some((b) => !!b.serverId);

  return (
    <div>
      {activeLangTabs.length > 0 && (
        <div className={langStyles.langTabsRow}>
          <button
            type="button"
            className={`${langStyles.langTab} ${activeLanguage === EN ? langStyles.langTabActive : ""}`}
            onClick={() => setActiveLanguage(EN)}
          >
            English
          </button>
          {activeLangTabs.map((lang) => (
            <button
              key={lang.id}
              type="button"
              className={`${langStyles.langTab} ${activeLanguage === lang.id ? langStyles.langTabActive : ""}`}
              onClick={() => hasSavedComponent && setActiveLanguage(lang.id)}
              disabled={!hasSavedComponent}
              title={!hasSavedComponent ? "Save at least one English component first to add translations" : undefined}
            >
              {lang.name}
              <span
                className={`${langStyles.langTabNative} ${activeLanguage === lang.id ? langStyles.langTabActiveNative : ""}`}
              >
                {lang.nativeName}
              </span>
              {isLanguageIncomplete(lang.id) && (
                <span title="Missing translations">
                  <MissingTranslationIcon />
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {afterTabsContent}

      <div className={styles.inputGroup} style={{ marginBottom: "16px" }}>
        <label className={styles.inputLabel}>
          Title{activeLanguage === EN && <span>*</span>}
        </label>
        <input
          className={styles.textInput}
          placeholder={activeLanguage === EN ? titlePlaceholder : title || titlePlaceholder}
          value={activeLanguage === EN ? title : titleTranslations[activeLanguage] || ""}
          onChange={(e) =>
            activeLanguage === EN
              ? setTitle(e.target.value)
              : setTitleTranslations((prev) => ({ ...prev, [activeLanguage]: e.target.value }))
          }
          onBlur={() => {
            // Auto-saves the title if it actually changed — `ensureContentShell` no-ops
            // (and skips the network call) when nothing did, e.g. clicking in and back out
            // without typing, so this alone never spams the missing-translations endpoint.
            // A real save already invalidates that query from inside the controller.
            void ensureContentShell({ silent: true }).then((ok) => ok && onContentChanged?.());
          }}
        />
      </div>

      <ContentBuilder
        blocks={blocks}
        onChange={setBlocks}
        isPastDate={isPastDate}
        hideAddComponentButton={hideAddComponentButton}
        activeLanguage={activeLanguage}
        onChangeTranslation={setBlockTranslation}
        onBeforeAddBlock={ensureContentShell}
        onSaveBlock={async (block) => {
          const ok = await ensureContentShell();
          if (!ok) return false;
          const label = COMPONENT_TYPE_LABELS[block.type];
          const result = await saveBlock(block);
          if (result.success) {
            showToast(`${label} component saved successfully.`, "success");
            void refetchMissingTranslations();
            onContentChanged?.();
            return true;
          }
          showToast(result.error || `Failed to save the ${label.toLowerCase()} component.`, "error");
          return false;
        }}
        onDeleteBlock={async (block) => {
          const label = COMPONENT_TYPE_LABELS[block.type];
          const result = await deleteBlock(block);
          if (result.success) {
            showToast(`${label} component deleted.`, "success");
            void refetchMissingTranslations();
            onContentChanged?.();
          } else {
            showToast(result.error || `Failed to delete the ${label.toLowerCase()} component.`, "error");
          }
        }}
        onReorder={reorderBlocks}
        blockStatuses={blockStatuses}
      />
    </div>
  );
}
