// ============================================
// Program Admin Sidebar Component
// Sidebar for program admin section
// ============================================

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import {
    ParticipantsIcon,
    TeamsIcon,
    GoalsHabitsIcon,
    SubmissionsIcon,
    ReportsIcon,
} from '@/components/common/icons/ProgramAdminIcons';
import styles from '@/styles/content-management-sidebar.module.css'; // Reusing base layout styles

interface NavItem {
    id: string;
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    hasNotification?: boolean;
}

const navItems: NavItem[] = [
    { id: 'mentees', label: 'Mentees', href: '/programAdmin/mentees', icon: ParticipantsIcon },
    { id: 'teams', label: 'Teams', href: '/programAdmin/teams', icon: TeamsIcon },
    { id: 'goals', label: 'Goals & Habits', href: '/programAdmin/goals', icon: GoalsHabitsIcon },
    { id: 'submissions', label: 'Submissions', href: '/programAdmin/submissions', icon: SubmissionsIcon, hasNotification: true },
    { id: 'reports', label: 'Reports', href: '/programAdmin/reports', icon: ReportsIcon },
];

export function ProgramAdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const programId = searchParams.get('programId');

    return (
        <aside className={styles.sidebar}>
            {/* Top Logo Section matching design */}
            <Link
                href="/programs"
                className={styles.logoTopSection}
                onClick={(e) => {
                    e.preventDefault();
                    router.push('/programs');
                }}
            >
                <Image
                    src="/icon.svg"
                    alt="Logo"
                    width={58}
                    height={60}
                    className={styles.topLogo}
                />
            </Link>

            <div className={styles.header}>
                <Link href="/programs" className={styles.backButton}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Program Admin
                </Link>
            </div>

            <nav className={styles.nav}>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    const hrefWithParams = programId ? `${item.href}?programId=${programId}` : item.href;

                    return (
                        <Link
                            key={item.id}
                            href={hrefWithParams}
                            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                        >
                            <div className={styles.icon}>
                                <Icon />
                            </div>
                            <span className={styles.label}>{item.label}</span>
                            {item.hasNotification && (
                                <span className={styles.dot}></span>
                            )}
                        </Link>
                    );
                })}
            </nav>

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
