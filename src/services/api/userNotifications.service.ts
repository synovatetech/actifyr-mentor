import { apiClient } from "./client";

export interface UserNotificationApiItem {
  id?: string | number;
  notification_id?: string | number;
  title?: string | null;
  notification_title?: string | null;
  subject?: string | null;
  message?: string | null;
  notification_message?: string | null;
  body?: string | null;
  content?: string | null;
  description?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  created_date?: string | null;
  notification_date?: string | null;
  updated_at?: string | null;
  read?: boolean | number | string | null;
  is_read?: boolean | number | string | null;
  read_status?: string | null;
  status?: string | null;
}

export type UserNotification = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
};

export type NotificationsListResult = {
  notifications: UserNotification[];
  readStatus: boolean;
};

const toBool = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "read", "seen"].includes(normalized)) return true;
    if (["0", "false", "unread", "new"].includes(normalized)) return false;
  }
  return false;
};

const toNotificationList = (payload: unknown): UserNotificationApiItem[] => {
  if (Array.isArray(payload)) {
    return payload as UserNotificationApiItem[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const data = payload as Record<string, unknown>;

  const listCandidate =
    data.notifications ??
    data.notification_list ??
    data.notification ??
    data.items ??
    data.results ??
    data.data;

  if (Array.isArray(listCandidate)) {
    return listCandidate as UserNotificationApiItem[];
  }

  if (listCandidate && typeof listCandidate === "object") {
    return toNotificationList(listCandidate);
  }

  return [];
};

const toReadStatus = (payload: unknown): boolean => {
  if (!payload || typeof payload !== "object") return false;

  const data = payload as Record<string, unknown>;
  const value =
    data.is_unread_notification_available ??
    data.read_status ??
    data.readStatus ??
    data.notification_read_status;

  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["unread", "new", "pending", "1", "true"].includes(normalized)) {
      return true;
    }
    if (["read", "seen", "cleared", "0", "false"].includes(normalized)) {
      return false;
    }
  }

  return false;
};

const mapApiNotification = (
  item: UserNotificationApiItem,
  index: number,
): UserNotification => {
  const createdAt = item.created_at || item.createdAt || item.updated_at;

  return {
    id: String(item.id ?? item.notification_id ?? `notification-${index}`),
    title: item.title || item.notification_title || item.subject || "Notification",
    message:
      item.message ||
      item.notification_message ||
      item.body ||
      item.content ||
      item.description ||
      "",
    createdAt:
      createdAt || item.created_date || item.notification_date || new Date().toISOString(),
    read: toBool(item.read ?? item.is_read ?? item.read_status ?? item.status),
  };
};

export async function listUserNotifications(): Promise<NotificationsListResult> {
  const response = await apiClient.get<unknown>("/client/notification");

  if (!response.success) {
    return { notifications: [], readStatus: false };
  }

  return {
    notifications: toNotificationList(response.data).map(mapApiNotification),
    readStatus: toReadStatus(response.data),
  };
}

const toNotificationId = (id: string): string | number => {
  const parsed = Number(id);
  if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
    return parsed;
  }
  return id;
};

export async function markNotificationsAsRead(
  notificationIds: string[],
): Promise<boolean> {
  if (!notificationIds.length) {
    return true;
  }

  const response = await apiClient.put<unknown>("/client/notification/read", {
    notification_ids: notificationIds.map(toNotificationId),
  });

  return response.success;
}

