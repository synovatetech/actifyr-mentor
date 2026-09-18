// ============================================
// Sidebar Navigation Component
// Based on Figma design with exact styling
// ============================================

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  ProgramsIcon,
  FeedbacksIcon,
  SupportIcon,
} from '@/components/common/icons/SidebarIcons';
import type { SidebarNavItem } from '@/types';
import styles from '@/styles/sidebar.module.css';
import { useClientAdmin } from '@/hooks/useClientAdmin';
import { filterNavItems } from '@/lib/routeAccess';

interface NavItemWithIcon extends Omit<SidebarNavItem, 'icon'> {
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItemWithIcon[] = [
  { id: 'programs', label: 'Programs', href: '/programs', active: true, icon: ProgramsIcon },
  { id: 'feedbacks', label: 'Feedbacks', href: '/feedbacks', icon: FeedbacksIcon },
  { id: 'support', label: 'Support', href: '/support', icon: SupportIcon },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { current_active_plan_type } = useClientAdmin();

  const visibleNavItems = filterNavItems(current_active_plan_type, navItems);

  const handleNavClick = () => {
    // Close sidebar on mobile when nav item is clicked
    if (window.innerWidth <= 1024 && onClose) {
      onClose();
    }
  };

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
      {/* Close Button - Mobile Only */}
      {onClose && (
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 6L6 18M6 6L18 18"
              stroke="rgba(30, 30, 30, 0.8)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {/* Navigation Items */}
      <nav className={styles.nav}>
        {visibleNavItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.id === 'programs' &&
              (pathname?.startsWith('/programs') || pathname?.startsWith('/programAdmin')));
          const IconComponent = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              onClick={handleNavClick}
            >
              <div className={styles.navIcon}>
                <IconComponent className={styles.navIconSvg} />
              </div>
              <span className={styles.navLabel}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Powered by Actifyr */}
      <div className={styles.footer}>
        <p className={styles.poweredBy}>Powered by</p>
        <div className={styles.logoContainer}>
          <Image
            src="/logo-mentor.png"
            alt="Actifyr Mentor"
            width={175}
            height={80}
            className={styles.logo}
          />
        </div>
      </div>
    </aside>
  );
}

