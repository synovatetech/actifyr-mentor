'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import styles from '@/styles/notifications.module.css';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message?: string;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Delete Notification',
    message = 'Are you sure you want to delete this notification? This action cannot be undone.'
}) => {
    if (!isOpen) return null;

    return createPortal(
        <div className={styles.modalOverlay}>
            <div className={styles.modalContainer} style={{ width: '400px', padding: '32px', textAlign: 'center' }}>
                <div style={{
                    width: '56px',
                    height: '56px',
                    background: '#FEF2F2',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px auto'
                }}>
                    <span style={{ fontSize: '24px', color: '#EF4444' }}>⚠️</span>
                </div>

                <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: '8px'
                }}>{title}</h3>

                <p style={{
                    fontSize: '14px',
                    color: '#6B7280',
                    lineHeight: '1.5',
                    marginBottom: '32px'
                }}>{message}</p>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        className={styles.closeBtn}
                        onClick={onClose}
                        style={{ flex: 1, padding: '12px' }}
                    >
                        Cancel
                    </button>
                    <button
                        className={styles.saveBtn}
                        onClick={onConfirm}
                        style={{ flex: 1, padding: '12px', background: '#EF4444' }}
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default DeleteConfirmationModal;
