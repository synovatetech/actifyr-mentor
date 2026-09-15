'use client';

import { useQuery } from '@tanstack/react-query';
import { plansService } from '@/services';
import type { Plan } from '@/types';

export function usePlans() {
  const { data, isLoading, error } = useQuery<Plan[]>({
    queryKey: ['plans'],
    queryFn: async () => {
      const response = await plansService.getPlans();
      if (!response.success) throw new Error(response.error || 'Failed to fetch plans');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    plans: data ?? [],
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
  };
}
