// ============================================
// Navbar Component - Basic (not used in plans page)
// The plans page has its own inline navbar with exact Figma styling
// ============================================

'use client';

import Link from 'next/link';
import Image from 'next/image';

export function Navbar() {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        height: '80px',
        background: '#FFFFFF',
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.15)',
      }}
    >
      <div className="flex items-center h-full px-9">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.svg"
            alt="Actifyr"
            width={109}
            height={44}
            priority
          />
        </Link>
      </div>
    </nav>
  );
}
