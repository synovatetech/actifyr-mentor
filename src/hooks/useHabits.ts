'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { habitsService } from '@/services/api/habits.service';
import { missingTranslationsKeys } from '@/hooks/useMissingTranslations';

export const habitKeys = {
  list: (programId: string | number) => ['habits', 'list', String(programId)] as const,
  detail: (id: string | number) => ['habits', 'detail', String(id)] as const,
};

export function useHabitsList(programId: string | number, enabled = true) {
  return useQuery({
    queryKey: habitKeys.list(programId),
    queryFn: async () => {
      const res = await habitsService.list(programId);
      if (!res.success) throw new Error(res.error || 'Failed to load habits');
      const data = Array.isArray(res.data) ? res.data : [];
      return [...data].sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
      );
    },
    enabled: enabled && !!programId,
  });
}

export function useHabitById(id: string | number | null) {
  return useQuery({
    queryKey: habitKeys.detail(id!),
    queryFn: async () => {
      const res = await habitsService.get(id!);
      if (!res.success || !res.data) throw new Error(res.error || 'Failed to load habit');
      return res.data;
    },
    enabled: !!id,
    staleTime: 0,
  });
}

export function useCreateHabit(programId: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => habitsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitKeys.list(programId) });
      queryClient.invalidateQueries({ queryKey: missingTranslationsKeys.program(programId) });
    },
  });
}

export function useUpdateHabit(programId: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Record<string, unknown> }) =>
      habitsService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: habitKeys.list(programId) });
      queryClient.removeQueries({ queryKey: habitKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: missingTranslationsKeys.program(programId) });
    },
  });
}

export function useDeleteHabit(programId: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => habitsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitKeys.list(programId) });
      queryClient.invalidateQueries({ queryKey: missingTranslationsKeys.program(programId) });
    },
  });
}
