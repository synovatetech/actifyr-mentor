"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  NotificationsListResult,
  UserNotification,
} from "@/services/api/userNotifications.service";
import {
  listUserNotifications,
  markNotificationsAsRead,
} from "@/services/api/userNotifications.service";

export const notificationsListQueryKey = ["notifications", "list"] as const;

export function useNotificationsList(enabled: boolean) {
  return useQuery<NotificationsListResult, Error>({
    queryKey: notificationsListQueryKey,
    queryFn: listUserNotifications,
    enabled,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

export function useMarkNotificationsRead() {
  return useMutation({
    mutationFn: (notificationIds: string[]) =>
      markNotificationsAsRead(notificationIds),
  });
}

export function useClearNotificationIndicator() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.setQueryData<NotificationsListResult>(
      notificationsListQueryKey,
      (previous) => {
        if (!previous) return { notifications: [], readStatus: false };
        return { ...previous, readStatus: false };
      },
    );
  };
}
