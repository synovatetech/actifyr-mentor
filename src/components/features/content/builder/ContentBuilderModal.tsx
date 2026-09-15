"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import styles from "@/styles/modular-learning.module.css";
import formStyles from "@/styles/add-content-modal.module.css";
import ConfirmCloseModal from "@/components/common/ConfirmCloseModal";
import { useToast } from "@/context/ToastContext";
import { convertUtcStringToPicker, getUserTimeZone } from "@/utils/date-time";
import LiveMultiLangContentBuilder from "@/components/features/content/builder/LiveMultiLangContentBuilder";
import AddComponentPicker from "@/components/features/content/builder/AddComponentPicker";
import type { ContentBlockType } from "@/components/features/content/content-builder.types";
import { useContentBuilderController } from "@/hooks/useContentBuilderController";
import { useContentBuilderContent, contentBuilderKeys } from "@/hooks/useContentBuilder";
import { contentBuilderService, type BuilderContentFullResponse } from "@/services/api/contentBuilder.service";
import { buildContentShellDateTime } from "@/utils/content-builder-payload";

interface ContentBuilderModalProps {
  onClose: () => void;
  /** Fires whenever something has actually been persisted (a content id exists) and the modal is closing — refresh the parent list/calendar. Closing before anything was ever saved calls `onClose` instead. */
  onContentBuilderSaved: () => void;
  onDelete?: (contentId: string) => void;
  /** Only needs an id to load — meta and blocks both hydrate from the content-builder detail endpoint. */
  initialData?: any;
  programTimezone?: string;
  programId?: string | number;
  isTrial?: boolean;
  /** Journey Learning forces every item to stay linked in sequence. */
  lockLinked?: boolean;
  defaultLinked?: boolean;
  selectedLanguages?: string[];
  /** e.g. "Milestone" vs "Content", for header/button copy. */
  itemLabel?: string;
  /** Fires after any save/delete that could change translation completeness (a component save, delete, title blur, or translation CSV import) — lets the host page background-refresh its list without waiting for the modal to close. */
  onContentChanged?: () => void;
}

interface ShellSnapshot {
  date: string;
  hh: string;
  mm: string;
  ampm: string;
  isLinked: boolean;
  title: string;
}

export default function ContentBuilderModal({
  onClose,
  onContentBuilderSaved,
  onDelete,
  initialData,
  programTimezone,
  programId,
  isTrial = false,
  lockLinked = false,
  defaultLinked = false,
  selectedLanguages,
  itemLabel = "Content",
  onContentChanged,
}: ContentBuilderModalProps) {
  const [mounted, setMounted] = useState(false);
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const timeZone = programTimezone || getUserTimeZone();
  const initialContentId = initialData?.content_id ?? initialData?.id;

  const builderController = useContentBuilderController({ programId });
  const {
    data: builderContent,
    isError: isContentQueryError,
    error: contentQueryError,
  } = useContentBuilderContent(
    programId,
    initialContentId,
    initialContentId != null,
  );

  // True from the moment this modal is asked to edit a particular content until that
  // content's data has actually been applied to local state — covers both a cold fetch
  // and the (much more common) case of reopening a content whose data is still cached,
  // so the loading overlay always reflects reality instead of only the network state.
  const isHydratingContent =
    initialContentId != null && String(builderController.contentId ?? "") !== String(initialContentId);

  const [date, setDate] = useState("");
  const [time, setTime] = useState({ hh: "hh", mm: "mm", ampm: "AM" });
  const [isLinked, setIsLinked] = useState(lockLinked || defaultLinked);
  const [validationError, setValidationError] = useState("");
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const savedShellSnapshotRef = useRef<ShellSnapshot | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Applies a fetched content-builder detail response onto both the shared controller
  // and this modal's own local date/time/link mirror — shared by the initial-load
  // hydrate effect below and by a fresh CSV import, which lands on an id this modal
  // never fetched through `useContentBuilderContent`.
  const applyHydratedContent = (data: BuilderContentFullResponse) => {
    builderController.hydrateFromServer(data);

    const linked = lockLinked || data.link_to_previous_content === true;
    // `data.date`/`data.time` are stored in UTC — convert to the program's local
    // timezone the same way the scheduler's AddContentModal does, instead of
    // reading the UTC hour as if it were already local.
    const parsed = convertUtcStringToPicker(`${data.date} ${data.time}`, timeZone);
    const parsedTime = { hh: parsed.hh, mm: parsed.mm, ampm: parsed.period };

    setDate(parsed.date);
    setTime(parsedTime);
    setIsLinked(linked);
    savedShellSnapshotRef.current = {
      date: parsed.date,
      ...parsedTime,
      isLinked: linked,
      title: data.title,
    };
    setValidationError("");
  };

  // Hydrates once per "session" (a session = this modal open for one particular content,
  // or a brand-new one) — never re-triggered by a background refetch of `builderContent`,
  // so it can't clobber mid-edit work.
  const openedForRef = useRef<string | number | "new" | null>(null);
  const hydratedForRef = useRef<string | number | "new" | null>(null);
  useEffect(() => {
    const key = initialContentId ?? "new";
    if (openedForRef.current !== key) {
      openedForRef.current = key;
      hydratedForRef.current = null;
      if (initialContentId == null) {
        builderController.reset();
        setDate("");
        setTime({ hh: "hh", mm: "mm", ampm: "AM" });
        setIsLinked(lockLinked || defaultLinked);
        savedShellSnapshotRef.current = null;
        setValidationError("");
        return;
      }
      // Fall through instead of returning: if `builderContent` is already sitting in the
      // query cache (e.g. this content was open before, closed, and reopened), it's
      // already available on this very first effect run for the new key. Returning here
      // unconditionally used to mean hydration only ever happened on a *second* effect
      // run triggered by `builderContent`'s reference changing — which a background
      // refetch reliably did on a slow/uncached connection, but silently never did once
      // the response was already cached (or came back byte-identical, since TanStack
      // Query keeps the same object reference via structural sharing), leaving the modal
      // blank on reopen.
    }
    if (initialContentId == null || !builderContent || hydratedForRef.current === key) return;
    hydratedForRef.current = key;
    applyHydratedContent(builderContent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContentId, builderContent, lockLinked, defaultLinked]);

  useEffect(() => {
    if (!isContentQueryError) return;
    showToast(
      contentQueryError instanceof Error ? contentQueryError.message : `Failed to load ${itemLabel.toLowerCase()} details`,
      "error",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isContentQueryError]);

  const dateOverrideFromPicker = (): Date | null => {
    if (!date) return null;
    const [y, m, d] = date.split("-").map((n) => parseInt(n, 10));
    return new Date(y, m - 1, d);
  };

  // No separate "save details" step: typing a title and adding (or saving) a component
  // creates the content shell on the fly, and keeps its date/time/link fields in sync on
  // every later save — this is called right before either, and also on blur of the
  // title/date/time fields and on toggling the link switch (all silent — a background
  // auto-save shouldn't scold the admin for fields that just aren't filled in yet).
  const ensureContentShell = async (opts?: {
    silent?: boolean;
    linkedOverride?: boolean;
  }): Promise<boolean> => {
    if (!builderController.title.trim()) {
      if (!opts?.silent) setValidationError("Title is required.");
      return false;
    }
    const dateOverride = dateOverrideFromPicker();
    if (!dateOverride) {
      if (!opts?.silent) setValidationError("Date is required.");
      return false;
    }
    if (time.hh === "hh" || time.mm === "mm") {
      if (!opts?.silent) setValidationError("Time is required.");
      return false;
    }
    setValidationError("");

    const linked = opts?.linkedOverride ?? isLinked;
    const snap = savedShellSnapshotRef.current;
    const unchanged =
      !!builderController.contentId &&
      !!snap &&
      snap.date === date &&
      snap.hh === time.hh &&
      snap.mm === time.mm &&
      snap.ampm === time.ampm &&
      snap.isLinked === linked &&
      snap.title === builderController.title &&
      !builderController.isTitleTranslationsDirty();
    if (unchanged) return true;

    try {
      await builderController.saveDetails({
        date: dateOverride,
        hour: time.hh,
        minute: time.mm,
        ampm: time.ampm as "AM" | "PM",
        timeZone,
        linkToPrevious: linked,
      });
      savedShellSnapshotRef.current = {
        date,
        hh: time.hh,
        mm: time.mm,
        ampm: time.ampm,
        isLinked: linked,
        title: builderController.title,
      };
      return true;
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : `Failed to save ${itemLabel.toLowerCase()} details`,
        "error",
      );
      return false;
    }
  };

  const handleAddBuilderComponent = async (type: ContentBlockType) => {
    const ok = await ensureContentShell();
    if (!ok) return;
    builderController.addBlock(type);
  };

  // English CSV import can only create a brand-new content — there's no "add more
  // English components to an existing content" route on the backend. Checked here,
  // on the button click itself, rather than only inside the upload handler: once
  // `csvInputRef` is disabled the click never reaches the file picker at all, so an
  // admin clicking it in this state would otherwise see nothing happen.
  const handleUploadTemplateClick = () => {
    if (isImportingCsv) return;
    if (builderController.contentId && builderController.activeLanguage === "en") {
      showToast(
        "This content already exists — add more components individually, or switch to a translation tab to import a translation CSV.",
        "error",
      );
      return;
    }
    if (!builderController.contentId) {
      const hasDate = !!dateOverrideFromPicker();
      const hasTime = time.hh !== "hh" && time.mm !== "mm";
      if (!hasDate || !hasTime) {
        showToast("Date and Time are required.", "error");
        return;
      }
    }
    csvInputRef.current?.click();
  };

  const handleDownloadTemplate = async () => {
    const res = await contentBuilderService.downloadImportCsvTemplate();
    if (!res.success) showToast(res.error || "Failed to download the template.", "error");
  };

  // CSV import is two different backend operations depending on where this modal
  // is: no content yet -> creates the whole content in one atomic import; an
  // existing content on a non-English tab -> translates it.
  const handleTemplateUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImportingCsv(true);
    try {
      if (!builderController.contentId) {
        const dateOverride = dateOverrideFromPicker();
        const hasTime = time.hh !== "hh" && time.mm !== "mm";
        if (!dateOverride || !hasTime) {
          showToast("Date and Time are required.", "error");
          return;
        }
        const { date: utcDate, time: utcTime } = buildContentShellDateTime(
          dateOverride,
          time.hh,
          time.mm,
          time.ampm as "AM" | "PM",
          timeZone,
        );
        const formData = new FormData();
        formData.append("file", file);
        formData.append("content_date", utcDate);
        formData.append("content_time", utcTime.slice(0, 5));
        // Journey Learning locks every item to stay linked in sequence (`isLinked` is
        // forced true via `lockLinked` and its toggle is disabled); Modular Learning
        // sends whatever the admin currently has the toggle set to.
        formData.append("link_to_previous_content", String(isLinked));

        const res = await contentBuilderService.importCsv(programId!, formData);
        if (!res.success || !res.data) throw new Error(res.error || "Failed to import this CSV file.");

        const full = await contentBuilderService.getContent(programId!, res.data.content_id, {
          includeTranslations: false,
        });
        if (full.success && full.data) applyHydratedContent(full.data);

        showToast(
          `Imported ${res.data.components_created} component(s), ${res.data.items_created} item(s).`,
          "success",
        );
      } else if (builderController.activeLanguage !== "en") {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("language_code", builderController.activeLanguage);

        const res = await contentBuilderService.importCsvTranslation(builderController.contentId, formData);
        if (!res.success || !res.data) throw new Error(res.error || "Failed to import this translation CSV.");

        void queryClient.invalidateQueries({
          queryKey: contentBuilderKeys.contentForLanguage(
            programId!,
            builderController.contentId,
            builderController.activeLanguage,
          ),
        });
        void queryClient.invalidateQueries({
          queryKey: contentBuilderKeys.missingTranslations(builderController.contentId),
        });
        onContentChanged?.();

        showToast(
          `Translated ${res.data.components_translated} component(s), ${res.data.items_translated} item(s).`,
          "success",
        );
      } else {
        showToast(
          "This content already exists — CSV import can only create a new content or add a translation, not add more English components.",
          "error",
        );
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to import this CSV file. Please check the template format.",
        "error",
      );
    } finally {
      setIsImportingCsv(false);
      event.target.value = "";
    }
  };

  const builderIsDirty =
    builderController.hasUnsavedBlocks ||
    builderController.isTitleTranslationsDirty() ||
    (!builderController.contentId
      ? builderController.title.trim().length > 0
      : !savedShellSnapshotRef.current ||
        savedShellSnapshotRef.current.date !== date ||
        savedShellSnapshotRef.current.hh !== time.hh ||
        savedShellSnapshotRef.current.mm !== time.mm ||
        savedShellSnapshotRef.current.ampm !== time.ampm ||
        savedShellSnapshotRef.current.isLinked !== isLinked ||
        savedShellSnapshotRef.current.title !== builderController.title);

  // Publishing is fully automatic on the backend once a component is saved, so closing is
  // the only signal we get that the author is "done" — refresh the parent list whenever
  // anything was actually persisted (a content id exists).
  const finishClose = () => {
    if (builderController.contentId != null) onContentBuilderSaved();
    else onClose();
  };

  const handleClose = () => {
    if (builderIsDirty) {
      setShowCloseConfirm(true);
      return;
    }
    finishClose();
  };

  const contentIdForDelete = builderController.contentId;
  const canDeleteContent = contentIdForDelete !== null && contentIdForDelete !== undefined;

  if (!mounted) return null;

  return createPortal(
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            {builderController.contentId ? `Edit ${itemLabel}` : `Add ${itemLabel}`}
          </div>
          <div className={styles.closeIcon} onClick={handleClose}>
            ✕
          </div>
        </div>

        {(builderController.isSavingDetails || isImportingCsv || isHydratingContent) && (
          <div className={formStyles.loadingOverlay}>
            <div className={formStyles.spinner}></div>
            <span>
              {isImportingCsv
                ? "Importing CSV..."
                : isHydratingContent
                  ? `Loading ${itemLabel.toLowerCase()}...`
                  : "Please wait..."}
            </span>
          </div>
        )}

        <div className={styles.modalBody}>
          <div style={isTrial ? { pointerEvents: "none", userSelect: "none" } : undefined}>
            <div className={formStyles.contentConfigHeaderRow}>
              <div className={formStyles.sectionTitle}>Content Configuration</div>
            </div>

            <div className={formStyles.configRow}>
              <div className={`${formStyles.configCol} ${formStyles.configBox}`}>
                <div className={formStyles.inputLabel}>
                  Date &amp; Time <span>*</span>
                </div>
                <div className={formStyles.sectionDescription}>
                  Set the date &amp; time when this {itemLabel.toLowerCase()} becomes available to participants on the app
                </div>
                <div className={formStyles.timeInputs}>
                  <input
                    type="date"
                    className={formStyles.configDateInput}
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setValidationError("");
                    }}
                    onClick={(e) => (e.target as any).showPicker?.()}
                    onBlur={() => void ensureContentShell({ silent: true })}
                  />
                  <select
                    className={formStyles.selectInput}
                    value={time.hh}
                    onChange={(e) => {
                      setTime({ ...time, hh: e.target.value });
                      setValidationError("");
                    }}
                    onBlur={() => void ensureContentShell({ silent: true })}
                  >
                    <option value="hh">hh</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                      <option key={h} value={h.toString().padStart(2, "0")}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <select
                    className={formStyles.selectInput}
                    value={time.mm}
                    onChange={(e) => {
                      setTime({ ...time, mm: e.target.value });
                      setValidationError("");
                    }}
                    onBlur={() => void ensureContentShell({ silent: true })}
                  >
                    <option value="mm">mm</option>
                    {["00", "15", "30", "45"].map((val) => (
                      <option key={val} value={val}>
                        {val}
                      </option>
                    ))}
                  </select>
                  <select
                    className={formStyles.selectInput}
                    value={time.ampm}
                    onChange={(e) => setTime({ ...time, ampm: e.target.value })}
                    onBlur={() => void ensureContentShell({ silent: true })}
                  >
                    <option>AM</option>
                    <option>PM</option>
                  </select>
                </div>
                <div className={formStyles.sectionDescription} style={{ paddingTop: "6px", marginBottom: 0 }}>
                  Timezone: <span style={{ color: "var(--color-primary)" }}>{timeZone}</span>
                </div>
              </div>
              <div className={`${formStyles.configCol} ${formStyles.configBox}`}>
                <div className={formStyles.inputLabel}>Link to Previous {itemLabel}</div>
                <div className={formStyles.sectionDescription}>
                  Participants must complete the previous {itemLabel.toLowerCase()} to unlock this one
                </div>
                <div className={formStyles.toggleContainer}>
                  <div
                    className={`${formStyles.toggleSwitch} ${isLinked ? formStyles.active : ""} ${
                      lockLinked ? formStyles.toggleSwitchDisabled : ""
                    }`}
                    onClick={() => {
                      if (lockLinked) return;
                      const next = !isLinked;
                      setIsLinked(next);
                      void ensureContentShell({ silent: true, linkedOverride: next });
                    }}
                  >
                    <div className={formStyles.toggleKnob}></div>
                  </div>
                  <span>Enable linking this {itemLabel.toLowerCase()}</span>
                </div>
                {lockLinked && (
                  <div className={formStyles.toggleLockedHint}>
                    <span className={formStyles.toggleLockedHintIcon}>i</span>
                    {itemLabel}s stay linked in sequence and can&rsquo;t be unlinked
                  </div>
                )}
              </div>
            </div>

            {validationError && (
              <div style={{ fontSize: "12px", color: "var(--color-primary)", marginBottom: "12px" }}>{validationError}</div>
            )}

            <div className={formStyles.contentConfigHeaderRow}>
              <div className={formStyles.sectionTitle}>Content Components</div>
            </div>

            <LiveMultiLangContentBuilder
              selectedLanguages={selectedLanguages}
              controller={builderController}
              programId={programId}
              ensureContentShell={ensureContentShell}
              onContentChanged={onContentChanged}
              hideAddComponentButton
              afterTabsContent={
                <div className={`${formStyles.configBox} ${formStyles.importContentBox}`}>
                  <div className={formStyles.importContentInfo}>
                    <div className={formStyles.importContentTitle}>Import Content</div>
                    <div className={formStyles.importContentDesc}>
                      Upload a filled-in CSV using the template below to create this content and all of
                      its components in one go
                    </div>
                  </div>
                  <div className={formStyles.importContentActions}>
                    <button
                      type="button"
                      className={formStyles.importDownloadLink}
                      onClick={() => void handleDownloadTemplate()}
                      disabled={isImportingCsv}
                    >
                      Download Template
                    </button>
                    <button
                      className={`${formStyles.uploadMediaBtn} ${formStyles.importUploadBtn}`}
                      type="button"
                      onClick={handleUploadTemplateClick}
                      disabled={isImportingCsv}
                      title={
                        !!builderController.contentId && builderController.activeLanguage === "en"
                          ? "This content already exists — add more components individually, or switch to a translation tab to import a translation CSV"
                          : undefined
                      }
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
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      Upload CSV
                    </button>
                    <input ref={csvInputRef} type="file" hidden accept=".csv,text/csv" onChange={handleTemplateUpload} />
                  </div>
                </div>
              }
            />
          </div>
        </div>

        {isTrial && <div className={styles.trialNotice}>Content editing is not available in Trial mode</div>}
        <div className={styles.modalFooter}>
          {onDelete && canDeleteContent ? (
            <span
              className={styles.deleteLink}
              onClick={isTrial ? undefined : () => setShowDeleteConfirm(true)}
              style={isTrial ? { opacity: 0.4, cursor: "not-allowed", pointerEvents: "none" } : undefined}
            >
              Delete this {itemLabel}
            </span>
          ) : builderController.blocks.length === 0 ? (
            <p className={formStyles.addComponentHelperText}>
              Build your day&apos;s content by adding one or more components. Each component represents a
              learning element such as text, media, assessment, poll, and many others.
            </p>
          ) : (
            <span />
          )}
          <div className={styles.rightButtons}>
            <AddComponentPicker
              existingTypes={builderController.blocks.map((b) => b.type)}
              onSelect={handleAddBuilderComponent}
              disabled={!builderController.title.trim() || isTrial || builderController.activeLanguage !== "en"}
              align="right"
              variant="secondary"
            />
          </div>
        </div>
      </div>

      {showCloseConfirm && (
        <ConfirmCloseModal
          onConfirm={() => {
            setShowCloseConfirm(false);
            finishClose();
          }}
          onCancel={() => setShowCloseConfirm(false)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmCloseModal
          title={`Delete ${itemLabel}`}
          message={`Are you sure you want to delete this ${itemLabel.toLowerCase()}? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          showDeleteIcon
          onConfirm={() => {
            setShowDeleteConfirm(false);
            if (canDeleteContent && onDelete) onDelete(String(contentIdForDelete));
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>,
    document.body,
  );
}
