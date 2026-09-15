'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { knowledgeCardService } from '@/services/api/knowledgeCard.service';
import { missingTranslationsKeys } from '@/hooks/useMissingTranslations';

export const knowledgeCardKeys = {
  list: (programId: string | number) => ['knowledgeCards', 'list', String(programId)] as const,
  detail: (id: string | number) => ['knowledgeCards', 'detail', String(id)] as const,
};

export function useKnowledgeCardsList(programId: string | number, enabled = true) {
  return useQuery({
    queryKey: knowledgeCardKeys.list(programId),
    queryFn: async () => {
      const res = await knowledgeCardService.list(programId);
      if (!res.success) throw new Error(res.error || 'Failed to load knowledge cards');
      const data = Array.isArray(res.data) ? res.data : [];
      return [...data].sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
      );
    },
    enabled: enabled && !!programId,
  });
}

export function useKnowledgeCardDetail(id: string | number | null | undefined, enabled = true) {
  return useQuery({
    queryKey: knowledgeCardKeys.detail(id ?? ''),
    queryFn: async () => {
      const res = await knowledgeCardService.get(id as string | number);
      if (!res.success) throw new Error(res.error || 'Failed to load knowledge card details');
      return res.data;
    },
    enabled: enabled && !!id,
    staleTime: 60 * 1000,
  });
}

export function useCreateKnowledgeCard(programId: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData) => knowledgeCardService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeCardKeys.list(programId) });
      queryClient.invalidateQueries({ queryKey: missingTranslationsKeys.program(programId) });
    },
  });
}

export function useUpdateKnowledgeCard(programId: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: FormData }) =>
      knowledgeCardService.update(id, data),
    onSuccess: (_response, { id }) => {
      queryClient.invalidateQueries({ queryKey: knowledgeCardKeys.list(programId) });
      queryClient.invalidateQueries({ queryKey: knowledgeCardKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: missingTranslationsKeys.program(programId) });
    },
  });
}

export function useDeleteKnowledgeCard(programId: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => knowledgeCardService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeCardKeys.list(programId) });
      queryClient.invalidateQueries({ queryKey: missingTranslationsKeys.program(programId) });
    },
  });
}
