// ============================================
// Program Admin Layout
// Wrapper for all program admin pages
// ============================================

'use client';

import { useState } from 'react';
import { ProgramAdminSidebar } from '@/components/layout/ProgramAdminSidebar';
import { DashboardNavbar } from '@/components/layout/DashboardNavbar';
import AuthGuard from '@/components/layout/guard/AuthGuard';
import { useClientAdmin } from '@/hooks/useClientAdmin';
import { PageLoader } from '@/components/ui/Loader';
import dashboardStyles from '@/styles/dashboard-layout.module.css';

function ProgramAdminLayoutContent({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { userName, userInitial, userLogo, loading } = useClientAdmin();

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const closeSidebar = () => {
        setSidebarOpen(false);
    };

    // removed early return to keep sidebar/navbar visible

    return (
        <div className={dashboardStyles.container}>
            <DashboardNavbar
                userName={userName}
                userInitial={userInitial}
                userLogo={userLogo}
                onMenuClick={toggleSidebar}
                sidebarOpen={sidebarOpen}
            />
            <ProgramAdminSidebar />
            {sidebarOpen && (
                <div className={dashboardStyles.overlay} onClick={closeSidebar} />
            )}
            <main className={dashboardStyles.mainContent} style={{ padding: 0 }}>
                {loading ? <PageLoader /> : children}
            </main>
        </div>
    );
}

export default function ProgramAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGuard>
            <ProgramAdminLayoutContent>{children}</ProgramAdminLayoutContent>
        </AuthGuard>
    );
}
