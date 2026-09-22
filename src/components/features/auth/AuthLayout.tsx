'use client';

import Image from 'next/image';
import Link from 'next/link';
import styles from '@/styles/auth.module.css';

interface AuthLayoutProps {
  children: React.ReactNode;
  showBackToLogin?: boolean;
  isCompact?: boolean;
}

export function AuthLayout({ children, showBackToLogin = false, isCompact = false }: AuthLayoutProps) {
  return (
    <div className={styles.pageWrapper}>
      {/* Left Panel - Peach with decorations */}
      <div className={styles.leftPanel} style={{ background: '#FCE8E2' }}>
        <Image
          src="/cred_page_side_img.svg"
          alt="Actifyr Background"
          fill
          priority
          style={{ objectFit: 'cover', objectPosition: 'left top' }}
        />
      </div>

      {/* Right Panel - White with logo and card */}
      <div className={`${styles.rightPanel} ${isCompact ? styles.rightPanelCompact : ''}`}>
        <Link href="/" className={`${styles.logo} ${isCompact ? styles.logoCompact : ''}`}>
          <Image src="/logo-mentor.png" alt="Actifyr Mentor" width={195} height={89} priority />
        </Link>
        <div className={`${styles.card} ${isCompact ? styles.cardCompact : ''}`}>{children}</div>
        {showBackToLogin && (
          <div className={styles.backLinkWrap}>
            <Link href="/login" className={styles.backLink}>
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
