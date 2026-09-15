'use client';

import { useQuery } from '@tanstack/react-query';
import {
  dashboardService,
  type ClientDashboardData,
} from '@/services/api/dashboard.service';

const EMPTY: ClientDashboardData = {
  programs: { active: 0, draft: 0, expired: 0 },
  user_licenses: { active: 0, expired: 0, expiring_in_30_days: 0 },
  admins: { active: 0 },
  mentors: { active: 0 },
  feedbacks: { unread: 0 },
  support: { open: 0 },
  recent_activity: [],
};

export function useDashboard() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await dashboardService.getDashboard();
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch dashboard data');
      }
      return response.data;
    },
  });

  return {
    dashboardData: data ?? EMPTY,
    loading: isPending,
    isError,
    refetch,
  };
}
