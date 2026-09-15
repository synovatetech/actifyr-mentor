'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { resourcesService } from '@/services/api/resources.service';
import { missingTranslationsKeys } from '@/hooks/useMissingTranslations';

export const resourceKeys = {
  list: (programId: string | number) => ['resources', 'list', String(programId)] as const,
  detail: (id: string | number) => ['resources', 'detail', String(id)] as const,
};

export function useResourcesList(programId: string | number, enabled = true) {
  return useQuery({
    queryKey: resourceKeys.list(programId),
    queryFn: async () => {
      const res = await resourcesService.list(programId);
      if (!res.success) throw new Error(res.error || 'Failed to load resources');
      const data = Array.isArray(res.data) ? res.data : [];
      return [...data].sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
      );
    },
    enabled: enabled && !!programId,
  });
}

export function useResourceDetail(id: string | number | null | undefined, enabled = true) {
  return useQuery({
    queryKey: resourceKeys.detail(id ?? ''),
    queryFn: async () => {
      const res = await resourcesService.get(id as string | number);
      if (!res.success) throw new Error(res.error || 'Failed to load resource details');
      return res.data;
    },
    enabled: enabled && !!id,
    staleTime: 60 * 1000,
  });
}

export function useCreateResource(programId: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData) => resourcesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.list(programId) });
      queryClient.invalidateQueries({ queryKey: missingTranslationsKeys.program(programId) });
    },
  });
}

export function useUpdateResource(programId: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: FormData }) =>
      resourcesService.update(id, data),
    onSuccess: (_response, { id }) => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.list(programId) });
      queryClient.invalidateQueries({ queryKey: resourceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: missingTranslationsKeys.program(programId) });
    },
  });
}

export function useDeleteResource(programId: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => resourcesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.list(programId) });
      queryClient.invalidateQueries({ queryKey: missingTranslationsKeys.program(programId) });
    },
  });
}
