// ============================================
// Dashboard Layout Component
// Shared layout for all dashboard pages
// ============================================

"use client";

import { useState } from "react";
import { DashboardNavbar } from "@/components/layout/DashboardNavbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { useClientAdmin } from "@/hooks/useClientAdmin";
import dashboardStyles from "@/styles/dashboard-layout.module.css";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { userName, userInitial, userLogo } = useClientAdmin();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className={dashboardStyles.container}>
      <DashboardNavbar
        userName={userName}
        userInitial={userInitial}
        userLogo={userLogo}
        onMenuClick={toggleSidebar}
        sidebarOpen={sidebarOpen}
      />
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <div className={dashboardStyles.overlay} onClick={closeSidebar} />
      )}
      <main className={`${dashboardStyles.mainContent} ${dashboardStyles.withoutBanner}`}>
        {children}
      </main>
    </div>
  );
}
