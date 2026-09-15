'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from '@/styles/badges-points.module.css';

interface RewardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { title: string; image: File | null }) => void;
    type: 'individual' | 'team';
    badgeName?: string;
    isEdit?: boolean;
    initialData?: {
        title?: string;
        imageUrl?: string | null;
    } | null;
    onDelete?: () => void;
}

export default function RewardModal({
    isOpen,
    onClose,
    onSave,
    type,
    badgeName,
    isEdit = false,
    initialData = null,
    onDelete,
}: RewardModalProps) {
    const [title, setTitle] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [previewSrc, setPreviewSrc] = useState<string | null>(null);

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        setTitle(initialData?.title || '');
        setImageFile(null);
        setImageUrl(initialData?.imageUrl ?? null);
    }, [isOpen, initialData]);

    useEffect(() => {
        if (!imageFile) {
            setPreviewSrc(imageUrl);
            return;
        }

        const objectUrl = URL.createObjectURL(imageFile);
        setPreviewSrc(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [imageFile, imageUrl]);

    if (!isOpen || !mounted) return null;

    const handleSave = () => {
        if (!title.trim()) return;
        onSave({ title: title.trim(), image: imageFile });
    };

    const modalTitle = `${isEdit ? 'Edit' : 'Add'} ${type === 'individual' ? 'Individual' : 'Team'} Reward`;
    const dialogAriaLabel = badgeName
        ? `${modalTitle} for ${badgeName}`
        : modalTitle;
    const canSave = Boolean(title.trim().length);

    return createPortal(
        <div className={styles.modalOverlay}>
            <div
                className={styles.modalContainer}
                role="dialog"
                aria-modal="true"
                aria-label={dialogAriaLabel}
            >
                <div className={styles.modalHeader}>{modalTitle}</div>

                <div className={styles.modalBody}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Reward Title</label>
                        <input
                            className={styles.input}
                            placeholder="Enter the title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Reward Image <span>(Optional)</span></label>
                        <div className={styles.dropzone}>
                            <input
                                type="file"
                                id="rewardImage"
                                style={{ display: 'none' }}
                                accept="image/*"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) setImageFile(e.target.files[0]);
                                }}
                            />
                            {previewSrc ? (
                                <div className={styles.rewardPreview}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={previewSrc}
                                        alt="Reward preview"
                                        className={styles.rewardPreviewImg}
                                        onError={(e) => {
                                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                </div>
                            ) : null}
                            <p className={styles.dropzoneText}>
                                {imageFile
                                    ? imageFile.name
                                    : imageUrl
                                      ? 'Current image selected'
                                      : 'Drag & Drop file here or'}
                            </p>
                            <button
                                className={styles.browseBtn}
                                type="button"
                                onClick={() => document.getElementById('rewardImage')?.click()}
                            >
                                Browse File
                            </button>
                        </div>
                    </div>
                </div>

                <div className={`${styles.modalFooter} ${styles.rewardModalFooter}`}>
                    <div className={styles.rewardModalLeft}>
                        {isEdit && onDelete ? (
                            <button
                                type="button"
                                className={styles.deleteRewardBtn}
                                onClick={onDelete}
                            >
                                Delete
                            </button>
                        ) : (
                            <span />
                        )}
                    </div>
                    <div className={styles.rewardModalRight}>
                        <button className={styles.closeBtn} type="button" onClick={onClose}>
                            Close
                        </button>
                        <button
                            className={styles.saveBtn}
                            type="button"
                            onClick={handleSave}
                            disabled={!canSave}
                        >
                            Save Reward
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
