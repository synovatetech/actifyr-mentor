"use client";

import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  contentBuilderService,
  API_TYPE_TO_BLOCK_TYPE,
  type BuilderContentFullResponse,
  type ComponentResponse,
} from "@/services/api/contentBuilder.service";
import { contentBuilderKeys } from "@/hooks/useContentBuilder";
import { buildComponentPayload, buildContentShellDateTime } from "@/utils/content-builder-payload";
import {
  createDefaultBlock,
  type ContentBlock,
  type ContentBlockType,
} from "@/components/features/content/content-builder.types";
import type { Task, Questionnaire } from "@/components/features/content/SharedContentForm";

export const ENGLISH_LANG = "en";

export interface BlockSaveStatus {
  status: "saving" | "success" | "error";
  error?: string;
}

/** True when a block has a locally-picked file pending upload — never skippable, even if it otherwise stringifies unchanged (a `File` has no own enumerable properties, so two different files can look identical to `JSON.stringify`). */
function blockHasPendingFile(block: ContentBlock): boolean {
  switch (block.type) {
    case "media":
      return block.items.some((i) => i.file || i.thumbnailFile);
    case "tasks":
      return block.tasks.some((t) => t.file);
    case "resource":
      return block.items.some((i) => i.file);
    default:
      return false;
  }
}

/** True when a previously-saved block has no pending edits, so re-saving it would be wasted work (and risk re-triggering the edit-lock/translation-drop rules for no reason). */
function isBlockUnchanged(block: ContentBlock, original: ContentBlock | undefined): boolean {
  if (!original || blockHasPendingFile(block)) return false;
  const { order: _a, ...current } = block;
  const { order: _b, ...previous } = original;
  return JSON.stringify(current) === JSON.stringify(previous);
}

/** Persists the current order for every already-saved block, matching its array position — add endpoints only ever append, so this is what actually fixes a component's position once it's inserted anywhere but last. Concurrent and best-effort. */
async function persistOrder(blocks: ContentBlock[]): Promise<void> {
  const persisted = blocks.filter((b) => b.serverId != null);
  await Promise.allSettled(
    persisted.map((b) => contentBuilderService.updateComponentMeta(b.serverId!, { order_index: b.order })),
  );
}

/** A rating's `labels` travel over the wire as a `{"1": "...", "2": "..."}` map (contiguous keys starting at "1") — converts it into the positional array the local `labels: string[]` shape uses. */
function labelsMapToArray(map: Record<string, string> | undefined): string[] {
  return Object.keys(map || {})
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => map![k]);
}

/**
 * Extracts one already-persisted block's editable text for a single non-English language from
 * a component resolved via `?language_code=<lang>` (data + `stored_title` fall back to English
 * field-by-field wherever nothing is translated yet — see content_builder_client_api.md §3.2).
 * Matched to `block`'s own items positionally by their saved server id, in the shape
 * `ContentBuilder.tsx` reads via `block.translations[lang]`.
 */
function resolvedComponentToTranslation(block: ContentBlock, storedTitle: string | null, data: any): Record<string, any> {
  const title = storedTitle || undefined;
  switch (block.type) {
    case "text":
      return { title, body: data?.body };
    case "poll":
      return {
        title,
        question: data?.question,
        options: block.options.map(
          (opt) => (data?.options || []).find((o: any) => String(o.id) === opt.id)?.option_text,
        ),
      };
    case "assessment":
      return {
        title,
        items: block.questions.map((q) => {
          const match = (Array.isArray(data) ? data : []).find((d: any) => String(d.id) === q.id);
          return match
            ? {
                question: match.question,
                option_a: match.option_a,
                option_b: match.option_b,
                option_c: match.option_c,
                option_d: match.option_d,
              }
            : null;
        }),
      };
    case "tasks":
      return {
        title,
        items: block.tasks.map((tsk) => {
          const match = (Array.isArray(data) ? data : []).find((d: any) => String(d.id) === tsk.id);
          return match ? { task: match.task } : null;
        }),
      };
    case "resource":
      return {
        title,
        items: block.items.map((it) => {
          const match = (Array.isArray(data) ? data : []).find((d: any) => String(d.id) === it.id);
          return match ? { label: match.label } : null;
        }),
      };
    case "reflection":
      return {
        title,
        questions: block.prompts.map(
          (p) => (Array.isArray(data) ? data : []).find((d: any) => String(d.id) === p.id)?.question,
        ),
      };
    case "true_false":
      return {
        title,
        statements: block.statements.map(
          (s) => (Array.isArray(data) ? data : []).find((d: any) => String(d.id) === s.id)?.statement,
        ),
      };
    case "rating": {
      // The API translates one shared `labels` map per rating, not per question — apply it
      // alongside every position's translated question text.
      const labels = labelsMapToArray(data?.labels);
      return {
        title,
        items: block.questions.map((q) => {
          const match = (data?.questions || []).find((d: any) => String(d.id) === q.id);
          return { question: match?.question, labels: labels.length ? labels : undefined };
        }),
      };
    }
    case "audio_response":
      return {
        title,
        prompts: block.prompts.map(
          (p) => (data?.prompts || []).find((d: any) => String(d.id) === p.id)?.instruction,
        ),
      };
    case "virtual_meeting":
    case "media":
    default:
      return { title };
  }
}

/** Converts an API `ComponentResponse` back into the local block shape, seeding `serverId`s for id-based reconcile types. */
function componentToBlock(component: ComponentResponse, order: number): ContentBlock | null {
  const type = API_TYPE_TO_BLOCK_TYPE[component.type];
  if (!type) return null;
  const base = {
    id: `srv_${component.id}`,
    order,
    title: component.stored_title || "",
    serverId: component.id,
  };
  const data = component.data;

  switch (type) {
    case "text":
      return { ...base, type, content: data?.body || "" };
    case "media":
      return {
        ...base,
        type,
        items: (Array.isArray(data) ? data : []).map((d: any, i: number) => ({
          id: `srv_${d.id}`,
          serverId: d.id,
          mediaType: d.type,
          name: d.name || "",
          path: d.path,
          previewUrl: d.path,
          thumbnail_path: d.thumbnail_path || undefined,
          duration: d.duration || 0,
          order: i,
        })),
      };
    case "assessment": {
      const questions: Questionnaire[] = (Array.isArray(data) ? data : []).map((d: any) => ({
        id: String(d.id),
        question: d.question || "",
        option_a: d.option_a || "",
        option_b: d.option_b || "",
        option_c: d.option_c || "",
        option_d: d.option_d || "",
        right_answer: d.right_answer || "",
      }));
      return { ...base, type, questions };
    }
    case "tasks": {
      const tasks: Task[] = (Array.isArray(data) ? data : []).map((d: any) => ({
        id: String(d.id),
        serverId: d.id,
        type: d.type || "general",
        title: "",
        description: d.task || "",
        action: Array.isArray(d.action) ? d.action : [],
        point: d.point ?? 0,
        existingAttachmentUrl: d.attachment || undefined,
      }));
      return { ...base, type, tasks };
    }
    case "resource":
      return {
        ...base,
        type,
        items: (Array.isArray(data) ? data : []).map((d: any) => ({
          id: String(d.id),
          serverId: d.id,
          type: d.type,
          label: d.label || "",
          value: d.type === "url" ? d.value || "" : "",
          existingFileUrl: d.type === "file" ? d.value || undefined : undefined,
          isDownloadable: !!d.is_downloadable,
          addToResourcesPage: d.resource_from === "both",
        })),
      };
    case "poll":
      return {
        ...base,
        type,
        question: data?.question || "",
        options: (data?.options || []).map((o: any) => ({ id: String(o.id), text: o.option_text || "" })),
      };
    case "reflection":
      return {
        ...base,
        type,
        prompts: (Array.isArray(data) ? data : []).map((d: any) => ({
          id: String(d.id),
          prompt: d.question || "",
          minChars: d.minimum_character_count ?? undefined,
        })),
      };
    case "true_false":
      return {
        ...base,
        type,
        statements: (Array.isArray(data) ? data : []).map((d: any) => ({
          id: String(d.id),
          statement: d.statement || "",
        })),
      };
    case "rating":
      return {
        ...base,
        type,
        questions: (data?.questions || []).map((d: any) => {
          const labels = labelsMapToArray(d.labels);
          return { id: String(d.id), question: d.question || "", scalePoints: labels.length, labels };
        }),
      };
    case "virtual_meeting": {
      const meeting = data?.meetings?.[0];
      let hour = "10";
      let minute = "00";
      let ampm: "AM" | "PM" = "AM";
      if (meeting?.meeting_time) {
        const [hStr, mStr] = String(meeting.meeting_time).split(":");
        let h = parseInt(hStr, 10);
        ampm = h >= 12 ? "PM" : "AM";
        if (h === 0) h = 12;
        else if (h > 12) h -= 12;
        hour = String(h);
        minute = mStr || "00";
      }
      return { ...base, type, url: meeting?.meeting_url || "", hour, minute, ampm };
    }
    case "audio_response":
      return {
        ...base,
        type,
        prompts: (data?.prompts || []).map((d: any) => ({
          id: String(d.id),
          instruction: d.instruction || "",
          maxDurationSeconds: 300 as const,
        })),
      };
    default:
      return null;
  }
}

export interface UseContentBuilderControllerOptions {
  programId?: string | number;
}

/**
 * Owns the Content Builder's server-backed state for one content shell: its canonical
 * (English-structured) block list with embedded per-language translations, and the
 * live save status of each block. Structural edits (add/delete/reorder/items) only
 * ever apply to the English block list — translations overlay text/files onto it.
 */
export function useContentBuilderController({ programId }: UseContentBuilderControllerOptions = {}) {
  const queryClient = useQueryClient();
  // Any save/delete that can change a language's completeness (a new/edited English
  // field or item position, or a component disappearing) invalidates this so the
  // language tabs' missing-translation indicators refresh without a manual reload.
  const invalidateMissingTranslations = useCallback(
    (id: number) => {
      void queryClient.invalidateQueries({ queryKey: contentBuilderKeys.missingTranslations(id) });
    },
    [queryClient],
  );

  // Keeps the cached content detail (`useContentBuilderContent`) in step with every
  // server-persisted change. Without this, the cache holds whatever was fetched on
  // first open — closing this modal and reopening the same content later would
  // re-hydrate from that now-stale snapshot instead of what was actually saved.
  const invalidateContentDetail = useCallback(
    (id: number) => {
      if (!programId) return;
      void queryClient.invalidateQueries({ queryKey: contentBuilderKeys.content(programId, id) });
    },
    [queryClient, programId],
  );

  const [contentId, setContentIdState] = useState<number | null>(null);
  // Mirrors `contentId` synchronously — `saveBlock` can run immediately after `saveDetails`
  // creates the shell, in the same async continuation, before React has re-rendered with the
  // new state. Reading the ref instead of the state closure avoids that stale-value race.
  const contentIdRef = useRef<number | null>(null);
  const setContentId = useCallback((id: number | null) => {
    contentIdRef.current = id;
    setContentIdState(id);
  }, []);
  const [status, setStatus] = useState<"draft" | "active">("draft");
  const [title, setTitle] = useState("");
  const [titleTranslations, setTitleTranslations] = useState<Record<string, string>>({});
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [activeLanguage, setActiveLanguage] = useState<string>(ENGLISH_LANG);
  const [blockStatuses, setBlockStatuses] = useState<Record<string, BlockSaveStatus>>({});
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  // Last-saved snapshot of each block, keyed by (client) block id — lets `saveBlock` skip
  // a no-op re-save instead of hitting the API every time a card is just opened and closed.
  const originalBlocksRef = useRef<Record<string, ContentBlock>>({});
  // Mirrors `titleTranslations` as of the last time it reflected the server's own state —
  // via a full hydrate, or via opening a language tab for the first time (which seeds a
  // language's title from the server, e.g. to "" when untranslated). Callers diff the live
  // `titleTranslations` state against this instead of a snapshot frozen at last *save*, so
  // merely opening/viewing a translation tab never reads as an unsaved edit.
  const titleTranslationsBaselineRef = useRef<Record<string, string>>({});

  const extractTitleTranslations = (translations: BuilderContentFullResponse["translations"]) =>
    (translations || []).reduce(
      (acc, t) => (t.title ? { ...acc, [t.language_code]: t.title } : acc),
      {} as Record<string, string>,
    );

  const reset = useCallback(() => {
    setContentId(null);
    setStatus("draft");
    setTitle("");
    setTitleTranslations({});
    setBlocks([]);
    setActiveLanguage(ENGLISH_LANG);
    setBlockStatuses({});
    originalBlocksRef.current = {};
    titleTranslationsBaselineRef.current = {};
  }, [setContentId]);

  const hydrateFromServer = useCallback((data: BuilderContentFullResponse) => {
    setContentId(data.id);
    setStatus(data.status);
    setTitle(data.title || "");
    const seededTitleTranslations = extractTitleTranslations(data.translations);
    setTitleTranslations(seededTitleTranslations);
    titleTranslationsBaselineRef.current = seededTitleTranslations;
    const mapped = [...data.components]
      .sort((a, b) => a.order_index - b.order_index)
      .map((c, i) => componentToBlock(c, i))
      .filter((b): b is ContentBlock => !!b);
    setBlocks(mapped);
    setActiveLanguage(ENGLISH_LANG);
    setBlockStatuses({});
    originalBlocksRef.current = Object.fromEntries(mapped.map((b) => [b.id, b]));
  }, [setContentId]);

  /**
   * Applies one language tab's fetched content (`?language_code=<lang>`) onto the already-loaded
   * English blocks — matched by each block's saved server id. Called once per language, the first
   * time its tab is opened.
   */
  const applyLanguageContent = useCallback((langCode: string, data: BuilderContentFullResponse) => {
    titleTranslationsBaselineRef.current = { ...titleTranslationsBaselineRef.current, [langCode]: data.title || "" };
    setTitleTranslations((prev) => ({ ...prev, [langCode]: data.title || "" }));
    const byServerId = new Map((data.components || []).map((c) => [c.id, c]));
    setBlocks((prev) => {
      const next = prev.map((block) => {
        if (block.serverId == null) return block;
        const component = byServerId.get(block.serverId);
        if (!component) return block;
        const overlay = resolvedComponentToTranslation(block, component.stored_title, component.data);
        const translations = { ...(block as any).translations, [langCode]: overlay };
        return { ...block, translations } as ContentBlock;
      });
      originalBlocksRef.current = { ...originalBlocksRef.current, ...Object.fromEntries(next.map((b) => [b.id, b])) };
      return next;
    });
  }, []);

  /** Current `titleTranslations` diffed against the server-known baseline — true only when an actual edit is pending, not merely from viewing a translation tab. */
  const isTitleTranslationsDirty = useCallback(
    () => JSON.stringify(titleTranslations) !== JSON.stringify(titleTranslationsBaselineRef.current),
    [titleTranslations],
  );

  /** Creates the content shell on first call, updates it on every call after. Returns the content id. */
  const saveDetails = useCallback(
    async (details: {
      date: Date;
      hour: string;
      minute: string;
      ampm: "AM" | "PM";
      timeZone: string;
      linkToPrevious: boolean;
    }): Promise<number> => {
      if (!programId) throw new Error("Missing program id");
      setIsSavingDetails(true);
      try {
        const { date, time } = buildContentShellDateTime(
          details.date,
          details.hour,
          details.minute,
          details.ampm,
          details.timeZone,
        );
        const translations = Object.entries(titleTranslations)
          .filter(([, t]) => t.trim())
          .map(([language_code, t]) => ({ language_code, title: t }));

        if (!contentIdRef.current) {
          const res = await contentBuilderService.createContent({
            program_id: programId,
            title,
            date,
            time,
            link_to_previous_content: details.linkToPrevious,
            ...(translations.length > 0 && { translations }),
          });
          if (!res.success || !res.data) throw new Error(res.error || "Failed to save content details");
          setContentId(res.data.id);
          setStatus(res.data.status);
          titleTranslationsBaselineRef.current = titleTranslations;
          invalidateMissingTranslations(res.data.id);
          return res.data.id;
        }
        const res = await contentBuilderService.updateContent(contentIdRef.current, {
          title,
          date,
          time,
          link_to_previous_content: details.linkToPrevious,
          ...(translations.length > 0 && { translations }),
        });
        if (!res.success || !res.data) throw new Error(res.error || "Failed to save content details");
        setStatus(res.data.status);
        titleTranslationsBaselineRef.current = titleTranslations;
        invalidateMissingTranslations(res.data.id);
        invalidateContentDetail(res.data.id);
        return res.data.id;
      } finally {
        setIsSavingDetails(false);
      }
    },
    [programId, title, titleTranslations, setContentId, invalidateMissingTranslations, invalidateContentDetail],
  );

  const applyServerResponse = useCallback((block: ContentBlock, saved: ComponentResponse): ContentBlock => {
    const data = saved.data;
    const withServerId = { ...block, serverId: saved.id } as ContentBlock;

    if (withServerId.type === "media" && Array.isArray(data)) {
      return {
        ...withServerId,
        items: withServerId.items.map((item, i) => {
          const d = data[i];
          if (!d) return item;
          return {
            ...item,
            serverId: d.id,
            file: undefined,
            thumbnailFile: undefined,
            thumbnailDataUrl: undefined,
            path: d.path,
            previewUrl: d.path,
            thumbnail_path: d.thumbnail_path || undefined,
          };
        }),
      };
    }
    if (withServerId.type === "tasks" && Array.isArray(data)) {
      return {
        ...withServerId,
        tasks: withServerId.tasks.map((task, i) => {
          const d = data[i];
          if (!d) return task;
          return { ...task, serverId: d.id, file: undefined, existingAttachmentUrl: d.attachment || undefined };
        }),
      };
    }
    if (withServerId.type === "resource" && Array.isArray(data)) {
      return {
        ...withServerId,
        items: withServerId.items.map((item, i) => {
          const d = data[i];
          if (!d) return item;
          return {
            ...item,
            serverId: d.id,
            file: item.type === "file" ? undefined : item.file,
            existingFileUrl: item.type === "file" ? d.value || undefined : item.existingFileUrl,
          };
        }),
      };
    }
    return withServerId;
  }, []);

  /**
   * Saves one component — POST if it has never been persisted, PUT after. Bundles every
   * language's translations in the one request. No-ops (reporting success) when nothing
   * actually changed since the last save. Not `useCallback`-wrapped on purpose — it reads
   * `blocks` fresh from this render's closure, the same way `saveDetails` needs the fresh
   * `contentIdRef` for the create-then-save-in-one-click case; there's always a render
   * between "add a block" and "save that block" for a user to click through, so no ref
   * is needed here, just the plain closure.
   */
  const saveBlock = async (block: ContentBlock): Promise<{ success: boolean; error?: string }> => {
    if (!contentIdRef.current) return { success: false, error: "Save the content details first." };
    const original = originalBlocksRef.current[block.id];
    if (isBlockUnchanged(block, original)) {
      setBlockStatuses((prev) => ({ ...prev, [block.id]: { status: "success" } }));
      return { success: true };
    }

    setBlockStatuses((prev) => ({ ...prev, [block.id]: { status: "saving" } }));
    try {
      const isUpdate = !!block.serverId;
      const payload = buildComponentPayload(block, isUpdate);
      const res = isUpdate
        ? await contentBuilderService.updateComponent(block.serverId!, block.type, payload)
        : await contentBuilderService.addComponent(contentIdRef.current, block.type, payload);
      if (!res.success || !res.data) throw new Error(res.error || "Failed to save this component");
      setStatus("active");
      const saved = applyServerResponse(block, res.data as ComponentResponse);
      const updatedBlocks = blocks.map((b) => (b.id === block.id ? saved : b));
      setBlocks(updatedBlocks);
      await persistOrder(updatedBlocks);
      originalBlocksRef.current = { ...originalBlocksRef.current, [block.id]: saved };
      setBlockStatuses((prev) => ({ ...prev, [block.id]: { status: "success" } }));
      invalidateMissingTranslations(contentIdRef.current);
      invalidateContentDetail(contentIdRef.current);
      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Failed to save";
      setBlockStatuses((prev) => ({ ...prev, [block.id]: { status: "error", error } }));
      return { success: false, error };
    }
  };

  const deleteBlock = async (block: ContentBlock): Promise<{ success: boolean; error?: string }> => {
    if (block.serverId) {
      const res = await contentBuilderService.deleteComponent(block.serverId);
      if (!res.success) return { success: false, error: res.error || "Failed to delete this component" };
      if (res.data) setStatus(res.data.content_status);
      if (contentIdRef.current) {
        invalidateMissingTranslations(contentIdRef.current);
        invalidateContentDetail(contentIdRef.current);
      }
    }
    setBlocks((prev) => prev.filter((b) => b.id !== block.id).map((b, i) => ({ ...b, order: i })));
    const { [block.id]: _removed, ...rest } = originalBlocksRef.current;
    originalBlocksRef.current = rest;
    setBlockStatuses((prev) => {
      const next = { ...prev };
      delete next[block.id];
      return next;
    });
    return { success: true };
  };

  /** Persists a drag-reorder immediately via one `meta` PUT per moved component. */
  const reorderBlocks = async (reordered: ContentBlock[]) => {
    setBlocks(reordered);
    await persistOrder(reordered);
  };

  const deleteContent = useCallback(async () => {
    if (!contentId) return true;
    const res = await contentBuilderService.deleteContent(contentId);
    return res.success;
  }, [contentId]);

  const setBlockTranslation = useCallback(
    (blockId: string, languageCode: string, patch: Record<string, any>) => {
      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== blockId) return b;
          const translations = { ...(b as any).translations } as Record<string, any>;
          translations[languageCode] = { ...translations[languageCode], ...patch };
          return { ...b, translations } as ContentBlock;
        }),
      );
    },
    [],
  );

  const addBlock = useCallback(
    (type: ContentBlockType) => {
      setBlocks((prev) => [...prev, createDefaultBlock(type, prev.length)]);
    },
    [],
  );

  // True when at least one block has never been saved, or has been edited since its last
  // successful save — the same check `saveBlock` itself uses to skip no-op re-saves.
  const hasUnsavedBlocks = blocks.some((b) => !isBlockUnchanged(b, originalBlocksRef.current[b.id]));

  // A block's "success" checkmark reflects the *last* save, not "nothing to save right
  // now" — without this, editing a block again (English, or a translation on any
  // language tab) after it was once saved leaves the old checkmark showing, wrongly
  // implying the new edit is already persisted. Suppress a stale "success" the moment
  // the block no longer matches its last-saved snapshot; "saving"/"error" always show.
  const displayBlockStatuses: Record<string, BlockSaveStatus> = {};
  for (const block of blocks) {
    const status = blockStatuses[block.id];
    if (!status) continue;
    if (status.status === "success" && !isBlockUnchanged(block, originalBlocksRef.current[block.id])) {
      continue;
    }
    displayBlockStatuses[block.id] = status;
  }

  return {
    contentId,
    status,
    isSavingDetails,
    title,
    setTitle,
    titleTranslations,
    setTitleTranslations,
    blocks,
    setBlocks,
    activeLanguage,
    setActiveLanguage,
    blockStatuses: displayBlockStatuses,
    hasUnsavedBlocks,
    isTitleTranslationsDirty,
    hydrateFromServer,
    applyLanguageContent,
    saveDetails,
    saveBlock,
    deleteBlock,
    reorderBlocks,
    deleteContent,
    setBlockTranslation,
    addBlock,
    reset,
  };
}
