'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quotesService, type UpdateQuotePayload } from '@/services/api/quotes.service';
import { missingTranslationsKeys } from '@/hooks/useMissingTranslations';

export const quoteKeys = {
  list: (programId: string | number) => ['quotes', 'list', String(programId)] as const,
};

export function useQuotesList(programId: string | number, enabled = true) {
  return useQuery({
    queryKey: quoteKeys.list(programId),
    queryFn: async () => {
      const res = await quotesService.get(programId);
      if (!res.success) throw new Error(res.error || 'Failed to load quotes');
      const data = res.data;
      return Array.isArray(data) ? data : (data?.quotes || []);
    },
    enabled: enabled && !!programId,
  });
}

export function useUpdateQuote(programId: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: UpdateQuotePayload }) =>
      quotesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.list(programId) });
      queryClient.invalidateQueries({ queryKey: missingTranslationsKeys.program(programId) });
    },
  });
}
