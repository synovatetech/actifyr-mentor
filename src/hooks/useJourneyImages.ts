'use client';

import { useQuery } from '@tanstack/react-query';
import { programsService, type JourneyImage } from '@/services/api/programs.service';

export type { JourneyImage };

export function useJourneyImages(enabled: boolean) {
  const { data: images = [], isPending: loading } = useQuery({
    queryKey: ['journey-images'],
    queryFn: async () => {
      const res = await programsService.getJourneyImages();
      if (!res.success) throw new Error(res.error || 'Failed to fetch journey images');
      return res.data ?? [];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  return { images, loading };
}
