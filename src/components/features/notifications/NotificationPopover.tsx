"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";
import {
  useMarkNotificationsRead,
  useNotificationsList,
} from "@/hooks/useNotifications";
import styles from "@/styles/notification-popover.module.css";

dayjs.extend(relativeTime);
dayjs.extend(utc);

type NotificationPopoverProps = {
  top: number;
  left: number;
  triggerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onNotificationsUpdated?: () => void;
};

export function NotificationPopover({
  top,
  left,
  triggerRef,
  onClose,
  onNotificationsUpdated,
}: NotificationPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, isError } = useNotificationsList(false);
  const markNotificationsRead = useMarkNotificationsRead();
  const unreadIds = useMemo(
    () =>
      data?.notifications
        ?.filter((item) => !item.read)
        .map((item) => item.id) ?? [],
    [data?.notifications],
  );

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (popoverRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;

      onClose();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, triggerRef]);

  const handleMarkAllAsRead = async () => {
    if (!unreadIds.length || markNotificationsRead.isPending) return;
    try {
      await markNotificationsRead.mutateAsync(unreadIds);
      onNotificationsUpdated?.();
    } catch {
      // Error toast is shown by the global MutationCache handler.
    }
  };

  const handleMarkOneAsRead = async (notificationId: string) => {
    if (markNotificationsRead.isPending) return;
    try {
      await markNotificationsRead.mutateAsync([notificationId]);
      onNotificationsUpdated?.();
    } catch {
      // Error toast is shown by the global MutationCache handler.
    }
  };

  return (
    <div
      ref={popoverRef}
      className={styles.popover}
      style={{ top, left }}
      role="dialog"
      aria-label="Notifications"
    >
      <div className={styles.arrow} />

      <div className={styles.header}>
        <div className={styles.title}>Notifications</div>
        <div className={styles.headerActions}>
          {unreadIds.length > 0 && (
            <button
              type="button"
              className={styles.markReadButton}
              onClick={handleMarkAllAsRead}
              disabled={markNotificationsRead.isPending}
            >
              Mark all as read
            </button>
          )}
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close notifications"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className={styles.body}>
        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            Loading notifications...
          </div>
        ) : isError ? (
          <div className={styles.error}>Failed to load notifications.</div>
        ) : data?.notifications?.length ? (
          <div className={styles.list}>
            {data.notifications.map((n) => (
              <div
                key={n.id}
                className={`${styles.item} ${!n.read ? styles.itemUnread : ""}`}
              >
                <div className={styles.itemContent}>
                  <div className={styles.itemTop}>
                    <div className={styles.itemTitle}>{n.title}</div>
                    {!n.read && (
                      <button
                        type="button"
                        className={styles.itemMarkReadButton}
                        onClick={() => handleMarkOneAsRead(n.id)}
                        disabled={markNotificationsRead.isPending}
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                  <div className={styles.itemMessage}>{n.message}</div>
                  <div className={styles.itemMeta}>
                    <span className={styles.itemTime}>
                      {dayjs.utc(n.createdAt).local().fromNow()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>No notifications yet.</div>
        )}
      </div>
    </div>
  );
}

