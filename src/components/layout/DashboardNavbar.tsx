// ============================================
// Dashboard Navbar Component
// With user profile, notifications, and logout
// ============================================

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "@/styles/dashboard-navbar.module.css";
import ConfirmCloseModal from "@/components/common/ConfirmCloseModal";
import { authService } from "@/services/api/auth.service";
import { NotificationPopover } from "@/components/features/notifications/NotificationPopover";
import { useNotificationsList } from "@/hooks/useNotifications";
import ProfileModal from "@/components/features/profile/ProfileModal";

interface DashboardNavbarProps {
  userName?: string;
  userInitial?: string;
  userLogo?: string | null;
  onMenuClick?: () => void;
  sidebarOpen?: boolean;
}

export function DashboardNavbar({
  userName = "Anu Sreenivasan",
  userInitial = "A",
  userLogo = null,
  onMenuClick,
  sidebarOpen = false,
}: DashboardNavbarProps) {
  const router = useRouter();
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const notificationButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { data: notificationsData, refetch: refetchNotifications } =
    useNotificationsList(true);
  const [notificationPopoverPos, setNotificationPopoverPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const hasUnreadIndicator = Boolean(notificationsData?.readStatus);

  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setShowLogoutMenu(false);
      }
    }

    if (showLogoutMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showLogoutMenu]);

  const handleNotificationClick = () => {
    setShowLogoutMenu(false);

    setIsNotificationsOpen((prev) => {
      const next = !prev;

      if (next && notificationButtonRef.current) {
        void refetchNotifications();
        const rect = notificationButtonRef.current.getBoundingClientRect();
        const popoverWidth = 360;
        const margin = 16;
        const left = Math.min(
          window.innerWidth - margin - popoverWidth,
          Math.max(margin, rect.right - popoverWidth),
        );
        const top = rect.bottom + 8;

        setNotificationPopoverPos({ top, left });
      }

      return next;
    });
  };

  const handleNotificationPopoverClose = () => {
    setIsNotificationsOpen(false);
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await authService.logout();
  };

  return (
    <>
      {/* Main Navbar */}
      <nav className={styles.navbar}>
        {/* Hamburger Menu Button - Mobile/Tablet Only */}
        <button
          type="button"
          className={styles.menuButton}
          onClick={onMenuClick}
          aria-label="Toggle menu"
          aria-expanded={sidebarOpen}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            {sidebarOpen ? (
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="rgba(30, 30, 30, 0.8)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <path
                d="M3 12H21M3 6H21M3 18H21"
                stroke="rgba(30, 30, 30, 0.8)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </button>

        {/* Logo Icon */}
        <Link
          href="/programs"
          className={styles.logoContainer}
          onClick={(e) => {
            e.preventDefault();
            router.push("/programs");
          }}
        >
          <img
            src="/logo-mentor.png"
            alt="Actifyr Mentor"
            width={100}
            height={46}
            className={styles.logo}
          />
        </Link>

        {/* Right Side - User Info */}
        <div className={styles.userSection}>
          {/* Notification Bell */}
          <button
            type="button"
            className={styles.notificationButton}
            onClick={handleNotificationClick}
            aria-label="Notifications"
            aria-haspopup="dialog"
            aria-expanded={isNotificationsOpen}
            ref={notificationButtonRef}
          >
            {hasUnreadIndicator && <div className={styles.notificationGlow} />}
            {hasUnreadIndicator && <div className={styles.notificationDot} />}
            <svg
              width="24"
              height="24"
              viewBox="0 0 25 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12.5 22C13.6 22 14.5 21.1 14.5 20H10.5C10.5 21.1 11.4 22 12.5 22ZM18.5 16V11C18.5 7.93 16.87 5.36 14 4.68V4C14 3.17 13.33 2.5 12.5 2.5C11.67 2.5 11 3.17 11 4V4.68C8.14 5.36 6.5 7.92 6.5 11V16L4.5 18V19H20.5V18L18.5 16Z"
                fill="#3E3E3E"
              />
            </svg>
          </button>

          {/* User Profile Area */}
          <div
            ref={profileRef}
            className={styles.userProfileWrapper}
            onClick={() => setShowLogoutMenu(!showLogoutMenu)}
          >
            {/* User Avatar */}
            {userLogo ? (
              <img
                src={userLogo}
                alt="User Avatar"
                className={styles.userAvatarImage}
              />
            ) : (
              <div className={styles.userAvatar}>
                <span className={styles.userInitial}>{userInitial}</span>
              </div>
            )}

            {/* User Name */}
            <span className={styles.userName}>{userName}</span>

            {showLogoutMenu && (
              <div className={styles.logoutMenu}>
                <button
                  className={styles.profileMenuButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLogoutMenu(false);
                    setShowProfileModal(true);
                  }}
                >
                  Profile
                </button>
                <div className={styles.menuDivider} />
                <button
                  className={styles.logoutButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLogoutMenu(false);
                    setShowLogoutModal(true);
                  }}
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {showLogoutModal && (
        <ConfirmCloseModal
          title="Confirm Logout"
          message="Are you sure you want to log out of your account?"
          confirmText="Log out"
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}

      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      {isNotificationsOpen && notificationPopoverPos && (
        <NotificationPopover
          top={notificationPopoverPos.top}
          left={notificationPopoverPos.left}
          triggerRef={notificationButtonRef as unknown as any}
          onClose={handleNotificationPopoverClose}
          onNotificationsUpdated={() => {
            void refetchNotifications();
          }}
        />
      )}
    </>
  );
}
