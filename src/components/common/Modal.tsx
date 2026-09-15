'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from '@/styles/modal.module.css';

interface ModalProps {
  onClose?: () => void;
  children: React.ReactNode;
  /** Extra class applied to the white card container */
  className?: string;
}

/**
 * Renders children inside a portal overlay.
 * Handles mount guard so it is safe to use in any Server-Component tree.
 * Clicking the backdrop calls onClose (if provided).
 */
export default function Modal({ onClose, children, className }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`${styles.card} ${className ?? ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
