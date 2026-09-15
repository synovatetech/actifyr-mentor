// ============================================
// usePrograms Hook - API handling with error states
// ============================================

'use client';

import { useState, useCallback } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { programsService } from '@/services/api/programs.service';
import type { Program } from '@/types';

interface UseProgramsReturn {
  programs: Program[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
  createProgram: (program: Omit<Program, 'id'>) => Promise<boolean>;
  updateProgram: (id: string, updates: Partial<Program>) => Promise<boolean>;
  deleteProgram: (id: string) => Promise<boolean>;
}

type ProgramStatusFilter = 'all' | Program['status'];

export function usePrograms(statusFilter: ProgramStatusFilter = 'all'): UseProgramsReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const queryKey = ['programs', searchQuery, statusFilter] as const;
  const pageSize = 6;

  const {
    data,
    isPending,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: refetchQuery,
    error: queryError,
  } = useInfiniteQuery({
    queryKey,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const response = await programsService.getPrograms(
        searchQuery,
        pageParam,
        pageSize,
        pageParam > 1,
        statusFilter,
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch programs');
      }

      return response.data.programs;
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === pageSize ? allPages.length + 1 : undefined,
  });

  const programs = (data?.pages ?? []).reduce<Program[]>((acc, page) => {
    const existingIds = new Set(acc.map(program => program.id));
    const uniquePrograms = page.filter(program => !existingIds.has(program.id));
    return [...acc, ...uniquePrograms];
  }, []);

  const loading = isPending;
  const loadingMore = isFetchingNextPage;
  const error = queryError instanceof Error ? queryError.message : null;
  const hasMore = Boolean(hasNextPage);

  const loadMore = useCallback(async () => {
    if (!isFetchingNextPage && hasNextPage) {
      await fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleSetSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const createProgram = useCallback(
    async (program: Omit<Program, 'id'>): Promise<boolean> => {
      try {
        const response = await programsService.createProgram(program);
        if (response.success) {
          await queryClient.invalidateQueries({ queryKey: ['programs'] });
          return true;
        } else {
          return false;
        }
      } catch {
        return false;
      }
    },
    [queryClient]
  );

  const updateProgram = useCallback(
    async (id: string, updates: Partial<Program>): Promise<boolean> => {
      try {
        const response = await programsService.updateProgram(id, updates);
        if (response.success) {
          await queryClient.invalidateQueries({ queryKey: ['programs'] });
          return true;
        } else {
          return false;
        }
      } catch {
        return false;
      }
    },
    [queryClient]
  );

  const deleteProgram = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const response = await programsService.deleteProgram(id);
        if (response.success) {
          await queryClient.invalidateQueries({ queryKey: ['programs'] });
          return true;
        } else {
          return false;
        }
      } catch {
        return false;
      }
    },
    [queryClient]
  );

  return {
    programs,
    loading,
    loadingMore,
    error,
    hasMore,
    searchQuery,
    setSearchQuery: handleSetSearchQuery,
    loadMore,
    refetch: async () => {
      await refetchQuery();
    },
    createProgram,
    updateProgram,
    deleteProgram,
  };
}

