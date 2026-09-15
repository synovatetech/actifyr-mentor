// ============================================
// Page Wrapper Component - Basic
// Note: Plans page uses its own inline styling for pixel-perfect design
// ============================================

import { Navbar } from './Navbar';
import { Footer } from './Footer';

interface PageWrapperProps {
  children: React.ReactNode;
  showNavbar?: boolean;
  showFooter?: boolean;
}

export function PageWrapper({
  children,
  showNavbar = true,
  showFooter = true,
}: PageWrapperProps) {
  return (
    <div 
      className="min-h-screen relative"
      style={{ backgroundColor: '#F9FAFB' }}
    >
      {showNavbar && <Navbar />}
      <main className="relative" style={{ paddingTop: '80px' }}>
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
}
