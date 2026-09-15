'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workbookService } from '@/services/api/workbook.service';
import { missingTranslationsKeys } from '@/hooks/useMissingTranslations';

export const workbookKeys = {
  list: (programId: string | number) => ['workbook', 'list', String(programId)] as const,
  detail: (id: string | number) => ['workbook', 'detail', String(id)] as const,
};

export function useWorkbookList(programId: string | number, enabled = true) {
  return useQuery({
    queryKey: workbookKeys.list(programId),
    queryFn: async () => {
      const res = await workbookService.list(programId);
      if (!res.success) throw new Error(res.error || 'Failed to load workbook');
      const data = Array.isArray(res.data) ? res.data : [];
      return [...data].sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
      );
    },
    enabled: enabled && !!programId,
  });
}

export function useWorkbookDetail(id: string | number | null | undefined, enabled = true) {
  return useQuery({
    queryKey: workbookKeys.detail(id ?? ''),
    queryFn: async () => {
      const res = await workbookService.get(id as string | number);
      if (!res.success) throw new Error(res.error || 'Failed to load workbook details');
      return res.data;
    },
    enabled: enabled && !!id,
    staleTime: 60 * 1000,
  });
}

export function useCreateWorkbook(programId: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData) => workbookService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workbookKeys.list(programId) });
      queryClient.invalidateQueries({ queryKey: missingTranslationsKeys.program(programId) });
    },
  });
}

export function useUpdateWorkbook(programId: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: FormData }) =>
      workbookService.update(id, data),
    onSuccess: (_response, { id }) => {
      queryClient.invalidateQueries({ queryKey: workbookKeys.list(programId) });
      queryClient.invalidateQueries({ queryKey: workbookKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: missingTranslationsKeys.program(programId) });
    },
  });
}

export function useDeleteWorkbook(programId: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => workbookService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workbookKeys.list(programId) });
      queryClient.invalidateQueries({ queryKey: missingTranslationsKeys.program(programId) });
    },
  });
}
