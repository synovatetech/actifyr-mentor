// ============================================
// Programs Layout
// Shared layout for all program pages
// ============================================

'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import AuthGuard from '@/components/layout/guard/AuthGuard';

export default function ProgramsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </AuthGuard>
  );
}

