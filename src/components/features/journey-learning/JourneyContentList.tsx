'use client';
import styles from '@/styles/journey-learning.module.css';

interface Inclusions {
    audio?: number;
    video?: number;
    questions?: number;
    tasks?: number;
}

interface JourneyItem {
    id: string;
    index: number;
    title: string;
    rating: number | null;
    ratingCount: number;
    unlockTime?: string;
    isLinked: boolean;
    inclusions: Inclusions;
    breakdown: string;
}

export default function JourneyContentList({
    items = [],
    onEdit
}: {
    items?: any[],
    onEdit?: (item: any) => void
}) {
    return (
        <div className={styles.journeyList}>
            {items.map((item, idx) => {
                const index = item.index || idx + 1;
                const inclusions = item.inclusions || {};

                return (
                    <div
                        key={item.id}
                        className={styles.journeyCard}
                        style={{ cursor: 'pointer' }}
                        onClick={() => onEdit?.(item)}
                    >
                        <div className={styles.cardLeft}>
                            <div className={styles.cardHeaderRow}>
                                <span className={styles.indexLabel}>#{index}</span>
                                <span className={styles.cardTitle}>{item.title}</span>
                                {item.rating ? (
                                    <div className={styles.ratingBadge}>
                                        {Number(item.rating).toFixed(1)} ⭐ <span className={styles.ratingCount}>({item.ratingCount || 0})</span>
                                    </div>
                                ) : (
                                    <span className={styles.noRatings}>⭐ No Ratings</span>
                                )}
                            </div>
                            <div className={styles.cardDetails}>
                                <div className={styles.inclusions}>
                                    Includes
                                    {inclusions.audio > 0 && <span> {inclusions.audio} Audio</span>}
                                    {inclusions.video > 0 && <span> {inclusions.audio > 0 ? '|' : ''} {inclusions.video} Video</span>}
                                    {inclusions.questions > 0 && <span> {(inclusions.audio > 0 || inclusions.video > 0) ? '|' : ''} {inclusions.questions} Question{inclusions.questions !== 1 ? 's' : ''}</span>}
                                    {inclusions.tasks > 0 && <span> {(inclusions.audio > 0 || inclusions.video > 0 || inclusions.questions > 0) ? '|' : ''} {inclusions.tasks} Task{inclusions.tasks !== 1 ? 's' : ''}</span>}
                                    {item.breakdown && <span className={styles.breakdown}> ({item.breakdown})</span>}
                                </div>
                            </div>
                        </div>
                        <div className={styles.cardRight}>
                            <div className={styles.unlockInfo}>
                                {item.unlock_date || item.unlockTime ? (
                                    <>Unlocks on <strong>{item.unlock_date || item.unlockTime}</strong></>
                                ) : (
                                    "Access Anytime"
                                )}
                            </div>
                            {(item.link_to_previous_content === 'true' || item.link_to_previous_content === true) && (
                                <div className={styles.linkStatus}>
                                    🔗 Linked to Previous Content
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
