'use client';

import styles from '@/styles/add-content-modal.module.css';
import type { MediaItem } from './content.types';

interface MediaPreviewModalProps {
    item: MediaItem | null;
    onClose: () => void;
}

const getMediaSource = (item: MediaItem) => item.path || item.previewUrl || '';

export default function MediaPreviewModal({ item, onClose }: MediaPreviewModalProps) {
    if (!item) return null;

    return (
        <div className={styles.mediaPreviewOverlay} onClick={onClose}>
            <div className={styles.mediaPreviewModal} onClick={(e) => e.stopPropagation()}>
                <button
                    className={styles.mediaPreviewCloseBtn}
                    onClick={onClose}
                >
                    ✕
                </button>
                <div className={styles.mediaPreviewHeader}>
                    {item.name || (item.type === 'video' ? 'Video' : 'Audio')}
                </div>
                <div className={styles.mediaPreviewBody}>
                    {item.type === 'video' ? (
                        <video
                            className={styles.mediaPreviewPlayer}
                            controls
                            autoPlay
                            playsInline
                            poster={item.thumbnail_path}
                            src={getMediaSource(item)}
                        />
                    ) : (
                        <div className={styles.audioPreviewWrapper}>
                            {!!item.thumbnail_path && (
                                <img
                                    src={item.thumbnail_path}
                                    alt={item.name || 'Audio thumbnail'}
                                    className={styles.audioPreviewThumbnail}
                                />
                            )}
                            <audio
                                className={styles.mediaPreviewAudio}
                                controls
                                autoPlay
                                src={getMediaSource(item)}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
