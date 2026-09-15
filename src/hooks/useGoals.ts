'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { goalsService } from '@/services/api/goals.service';
import { missingTranslationsKeys } from '@/hooks/useMissingTranslations';

export const goalKeys = {
  list: (programId: string | number) => ['goals', 'list', String(programId)] as const,
  detail: (id: string | number) => ['goals', 'detail', String(id)] as const,
};

export function useGoalsList(programId: string | number, enabled = true) {
  return useQuery({
    queryKey: goalKeys.list(programId),
    queryFn: async () => {
      const res = await goalsService.list(programId);
      if (!res.success) throw new Error(res.error || 'Failed to load goals');
      const data = Array.isArray(res.data) ? res.data : [];
      return [...data].sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
      );
    },
    enabled: enabled && !!programId,
  });
}

export function useGoalById(id: string | number | null) {
  return useQuery({
    queryKey: goalKeys.detail(id!),
    queryFn: async () => {
      const res = await goalsService.get(id!);
      if (!res.success || !res.data) throw new Error(res.error || 'Failed to load goal');
      return res.data;
    },
    enabled: !!id,
    staleTime: 0,
  });
}

export function useCreateGoal(programId: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => goalsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.list(programId) });
      queryClient.invalidateQueries({ queryKey: missingTranslationsKeys.program(programId) });
    },
  });
}

export function useUpdateGoal(programId: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Record<string, unknown> }) =>
      goalsService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: goalKeys.list(programId) });
      queryClient.removeQueries({ queryKey: goalKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: missingTranslationsKeys.program(programId) });
    },
  });
}

export function useDeleteGoal(programId: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => goalsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.list(programId) });
      queryClient.invalidateQueries({ queryKey: missingTranslationsKeys.program(programId) });
    },
  });
}
