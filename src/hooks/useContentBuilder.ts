"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  contentBuilderService,
  type BuilderContentFullResponse,
} from "@/services/api/contentBuilder.service";
import type { ContentBlockType } from "@/components/features/content/content-builder.types";

export const contentBuilderKeys = {
  content: (programId: string | number, contentId: string | number) =>
    ["contentBuilder", "content", String(programId), String(contentId)] as const,
  contentForLanguage: (programId: string | number, contentId: string | number, languageCode: string) =>
    ["contentBuilder", "content", String(programId), String(contentId), "lang", languageCode] as const,
  missingTranslations: (contentId: string | number) =>
    ["contentBuilder", "missingTranslations", String(contentId)] as const,
};

export function useContentBuilderContent(
  programId: string | number | null | undefined,
  contentId: string | number | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: contentBuilderKeys.content(programId ?? "", contentId ?? ""),
    queryFn: async () => {
      const res = await contentBuilderService.getContent(programId as string | number, contentId as string | number, {
        includeTranslations: false,
      });
      if (!res.success) throw new Error(res.error || "Failed to load content");
      return res.data as BuilderContentFullResponse;
    },
    enabled: enabled && !!programId && !!contentId,
    // Every save/delete explicitly invalidates this query key (see
    // useInvalidateContentBuilderContent), so a short staleTime is safe here and avoids
    // an extra network round-trip every time an admin closes and reopens the same
    // content within a few seconds.
    staleTime: 30 * 1000,
  });
}

/** Fetches the content resolved into one non-English language — fired on demand when its language tab is opened, rather than up front, so an admin who never opens the Hindi tab never pays for Hindi. Cached per language by TanStack Query, so re-opening an already-visited tab doesn't refetch. */
export function useContentBuilderContentForLanguage(
  programId: string | number | null | undefined,
  contentId: string | number | null | undefined,
  languageCode: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: contentBuilderKeys.contentForLanguage(programId ?? "", contentId ?? "", languageCode ?? ""),
    queryFn: async () => {
      const res = await contentBuilderService.getContent(programId as string | number, contentId as string | number, {
        languageCode: languageCode as string,
        includeTranslations: false,
      });
      if (!res.success) throw new Error(res.error || "Failed to load translation");
      return res.data as BuilderContentFullResponse;
    },
    enabled: enabled && !!programId && !!contentId && !!languageCode && languageCode !== "en",
    staleTime: 60 * 1000,
  });
}

export function useContentBuilderMissingTranslations(contentId: string | number | null | undefined, enabled = true) {
  return useQuery({
    queryKey: contentBuilderKeys.missingTranslations(contentId ?? ""),
    queryFn: async () => {
      const res = await contentBuilderService.getMissingTranslations(contentId as string | number);
      if (!res.success) throw new Error(res.error || "Failed to load translation status");
      return res.data;
    },
    enabled: enabled && !!contentId,
    staleTime: 30 * 1000,
  });
}

export function useCreateContentBuilderContent() {
  return useMutation({
    mutationFn: (data: Parameters<typeof contentBuilderService.createContent>[0]) =>
      contentBuilderService.createContent(data),
  });
}

export function useUpdateContentBuilderContent() {
  return useMutation({
    mutationFn: ({
      contentId,
      data,
    }: {
      contentId: string | number;
      data: Parameters<typeof contentBuilderService.updateContent>[1];
    }) => contentBuilderService.updateContent(contentId, data),
  });
}

export function useDeleteContentBuilderContent() {
  return useMutation({
    mutationFn: (contentId: string | number) => contentBuilderService.deleteContent(contentId),
  });
}

export function useAddComponent() {
  return useMutation({
    mutationFn: ({
      contentId,
      type,
      data,
    }: {
      contentId: string | number;
      type: ContentBlockType;
      data: FormData | Record<string, any>;
    }) => contentBuilderService.addComponent(contentId, type, data),
  });
}

export function useUpdateComponent() {
  return useMutation({
    mutationFn: ({
      componentId,
      type,
      data,
    }: {
      componentId: string | number;
      type: ContentBlockType;
      data: FormData | Record<string, any>;
    }) => contentBuilderService.updateComponent(componentId, type, data),
  });
}

export function useDeleteComponent() {
  return useMutation({
    mutationFn: (componentId: string | number) => contentBuilderService.deleteComponent(componentId),
  });
}

export function useUpdateComponentMeta() {
  return useMutation({
    mutationFn: ({
      componentId,
      data,
    }: {
      componentId: string | number;
      data: { title?: string; order_index?: number };
    }) => contentBuilderService.updateComponentMeta(componentId, data),
  });
}

/** Invalidates a content's cached detail — call after any component mutation so a re-fetch picks up fresh server ids. */
export function useInvalidateContentBuilderContent() {
  const queryClient = useQueryClient();
  return (programId: string | number, contentId: string | number) =>
    queryClient.invalidateQueries({ queryKey: contentBuilderKeys.content(programId, contentId) });
}
