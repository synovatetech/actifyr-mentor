'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import styles from '@/styles/modular-learning.module.css';
import { MissingTranslationIcon } from '@/components/common/icons/MissingTranslationIcon';
import { Reorder, useDragControls } from 'framer-motion';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDateTimeInTz(dateTimeUtc: string, tz?: string): { date: string; time: string } {
    if (!dateTimeUtc) return { date: '', time: '' };
    const dt = tz ? dayjs.utc(dateTimeUtc).tz(tz) : dayjs.utc(dateTimeUtc).local();
    if (!dt.isValid()) return { date: dateTimeUtc, time: '' };
    return { date: dt.format('DD MMM YYYY'), time: dt.format('hh:mm A') };
}

function getGroupKey(item: any): string {
    const dt = item.date_time;
    if (!dt) return `solo-${item.id ?? item.content_id}`;
    return dayjs.utc(dt).format('YYYY-MM-DDTHH:mm');
}

// ─── Icons ──────────────────────────────────────────────────────────────────

function GripDotsIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <circle cx="6" cy="4.5" r="1.5" fill="currentColor" />
            <circle cx="12" cy="4.5" r="1.5" fill="currentColor" />
            <circle cx="6" cy="9" r="1.5" fill="currentColor" />
            <circle cx="12" cy="9" r="1.5" fill="currentColor" />
            <circle cx="6" cy="13.5" r="1.5" fill="currentColor" />
            <circle cx="12" cy="13.5" r="1.5" fill="currentColor" />
        </svg>
    );
}

function ReorderIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2 4h10M2 7h10M2 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    );
}

// ─── Shared card body (used by both static and sortable cards) ───────────────

function CardBody({
    item,
    programTimezone,
    isDragging = false,
    dragHandleProps,
}: {
    item: any;
    programTimezone?: string;
    isDragging?: boolean;
    dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}) {
    const index = item.order_index ?? item.index ?? '—';
    const audioCount = item.audio_count ?? item.inclusions?.audio ?? 0;
    const videoCount = item.video_count ?? item.inclusions?.video ?? 0;
    const questionCount = item.questionnaire_count ?? item.inclusions?.questions ?? 0;
    const taskCounts = item.task_counts ?? {};
    const totalTasks =
        (taskCounts.pow ?? 0) +
        (taskCounts.poi ?? 0) +
        (taskCounts.poa ?? 0) +
        (taskCounts.general ?? 0);
    const hasInclusions = audioCount > 0 || videoCount > 0 || questionCount > 0 || totalTasks > 0;

    const taskBreakdownParts: string[] = [];
    if ((taskCounts.pow ?? 0) > 0) taskBreakdownParts.push(`${taskCounts.pow} PoW`);
    if ((taskCounts.poi ?? 0) > 0) taskBreakdownParts.push(`${taskCounts.poi} PoI`);
    if ((taskCounts.poa ?? 0) > 0) taskBreakdownParts.push(`${taskCounts.poa} PoA`);
    if ((taskCounts.general ?? 0) > 0) taskBreakdownParts.push(`${taskCounts.general} General`);

    const rating = item.average_content_rating ?? item.rating ?? 0;
    const ratingCount = item.total_ratings ?? item.ratingCount ?? 0;
    const dateTimeUtc = item.date_time ?? item.date ?? item.unlock_date ?? '';
    const { date: formattedDate, time: formattedTime } = formatDateTimeInTz(dateTimeUtc, programTimezone);

    return (
        <div className={`${styles.contentCard} ${isDragging ? styles.cardDragging : ''}`}>
            {dragHandleProps && (
                <div className={styles.dragHandle} {...dragHandleProps}>
                    <GripDotsIcon />
                </div>
            )}

            <div className={`${styles.cardLeft} ${dragHandleProps ? styles.cardLeftWithHandle : ''}`}>
                <div className={styles.cardHeaderRow}>
                    <span className={styles.indexLabel}>#{index}</span>
                    <span className={styles.cardTitle}>{item.title}</span>
                    {item.is_translation_missing && (
                        <span className={styles.missingTranslationBadge} title="Missing translations">
                            <MissingTranslationIcon />
                        </span>
                    )}
                    {item.status && (
                        <span className={`${styles.statusBadge} ${styles[`status_${item.status}`]}`}>
                            {item.status}
                        </span>
                    )}
                    {rating > 0 ? (
                        <div className={styles.ratingBadge}>
                            {Number(rating).toFixed(1)} <span style={{ fontSize: '10px' }}>★</span>
                            <span className={styles.ratingCount}>({ratingCount})</span>
                        </div>
                    ) : (
                        <span className={styles.noRatings}>★ No Ratings</span>
                    )}
                </div>
                <div className={styles.cardDetails}>
                    {hasInclusions ? (
                        <div className={styles.inclusions}>
                            Includes{' '}
                            {audioCount > 0 && <span>{audioCount} Audio</span>}
                            {videoCount > 0 && <span>{audioCount > 0 ? <span className={styles.inclusionSeparator}> | </span> : ''}{videoCount} Video</span>}
                            {questionCount > 0 && (
                                <span>{(audioCount > 0 || videoCount > 0) ? <span className={styles.inclusionSeparator}> | </span> : ''}{questionCount} Question{questionCount !== 1 ? 's' : ''}</span>
                            )}
                            {totalTasks > 0 && (
                                <span>
                                    {(audioCount > 0 || videoCount > 0 || questionCount > 0) ? <span className={styles.inclusionSeparator}> | </span> : ''}{totalTasks} Task{totalTasks !== 1 ? 's' : ''}
                                    {taskBreakdownParts.length > 0 && (
                                        <span className={styles.breakdown}>
                                            {' ('}
                                            {taskBreakdownParts.map((part, i) => (
                                                <span key={i}>
                                                    {i > 0 && <span className={styles.inclusionSeparator}> | </span>}
                                                    {part}
                                                </span>
                                            ))}
                                            {')'}
                                        </span>
                                    )}
                                </span>
                            )}
                        </div>
                    ) : (
                        <div className={styles.inclusions}>No inclusions yet</div>
                    )}
                </div>
            </div>

            <div className={styles.cardRight}>
                <div className={styles.unlockInfo}>
                    {formattedDate ? (
                        <>
                            Unlocks on <strong>{formattedDate}</strong>
                            {formattedTime && <> at <strong>{formattedTime}</strong></>}
                        </>
                    ) : (
                        'Access Anytime'
                    )}
                </div>
                {item.link_to_previous_content === true ||
                    item.link_to_previous_content === 'true' ||
                    item.link_to_previous_content === 1 ? (
                    <div className={styles.linkStatus}>Linked to Previous Content</div>
                ) : (
                    <div className={styles.independentStatus}>Independent Content</div>
                )}
            </div>
        </div>
    );
}

// ─── Static card (single-item groups) ───────────────────────────────────────

function StaticCard({ item, onEdit, programTimezone }: { item: any; onEdit?: (item: any) => void; programTimezone?: string }) {
    return (
        <div onClick={() => onEdit?.(item)} style={{ cursor: 'pointer' }}>
            <CardBody item={item} programTimezone={programTimezone} />
        </div>
    );
}

// ─── Sortable card (inside reorderable groups) ───────────────────────────────

function SortableCard({
    item,
    onEdit,
    programTimezone,
    onDragStart,
    onDragEnd,
}: {
    item: any;
    onEdit?: (item: any) => void;
    programTimezone?: string;
    onDragStart?: () => void;
    onDragEnd?: () => void;
}) {
    const controls = useDragControls();
    const [isDragging, setIsDragging] = useState(false);

    return (
        <Reorder.Item
            value={item}
            dragListener={false}
            dragControls={controls}
            style={{ listStyle: 'none' }}
            onDragStart={() => {
                setIsDragging(true);
                onDragStart?.();
            }}
            onDragEnd={() => {
                setIsDragging(false);
                onDragEnd?.();
            }}
            layout
            layoutId={String(item.id ?? item.content_id)}
        >
            <div
                onClick={() => { if (!isDragging) onEdit?.(item); }}
                style={{ cursor: 'pointer' }}
            >
                <CardBody
                    item={item}
                    programTimezone={programTimezone}
                    isDragging={isDragging}
                    dragHandleProps={{
                        onPointerDown: (e) => {
                            e.stopPropagation();
                            controls.start(e);
                        },
                        onClick: (e) => e.stopPropagation(),
                        title: 'Drag to reorder',
                    }}
                />
            </div>
        </Reorder.Item>
    );
}

// ─── Reorderable group (2+ items with the same date_time) ───────────────────

function ReorderableGroup({
    initialItems,
    onEdit,
    programTimezone,
    onReorder,
}: {
    initialItems: any[];
    onEdit?: (item: any) => void;
    programTimezone?: string;
    onReorder?: (reorderedGroupItems: any[]) => void;
}) {
    const [localOrder, setLocalOrder] = useState(initialItems);
    const [isDraggingAny, setIsDraggingAny] = useState(false);
    const localOrderRef = useRef(initialItems);
    const preDragOrderRef = useRef<any[]>([]);

    useEffect(() => {
        setLocalOrder(initialItems);
        localOrderRef.current = initialItems;
    }, [initialItems]);

    function handleReorder(newOrder: any[]) {
        localOrderRef.current = newOrder;
        setLocalOrder(newOrder);
    }

    function handleDragStart() {
        setIsDraggingAny(true);
        document.body.style.userSelect = 'none';
        preDragOrderRef.current = [...localOrderRef.current];
    }

    function handleDragEnd() {
        setIsDraggingAny(false);
        document.body.style.userSelect = '';

        const pre = preDragOrderRef.current;
        if (!pre.length) return;
        const post = localOrderRef.current;
        const hasChanged = pre.some((item, idx) => item.id !== post[idx]?.id);
        if (!hasChanged) return;

        const originalOrderIndices = pre.map(i => i.order_index ?? 0);
        const updated = post.map((item, idx) => ({
            ...item,
            order_index: originalOrderIndices[idx],
        }));
        setLocalOrder(updated);
        localOrderRef.current = updated;
        preDragOrderRef.current = [];

        onReorder?.(updated);
    }

    return (
        <div className={`${styles.reorderableGroup} ${isDraggingAny ? styles.reorderableGroupActive : ''}`}>
            {isDraggingAny && (
                <div className={styles.groupBadge}>
                    <ReorderIcon />
                    <span>Drag to reorder contents</span>
                </div>
            )}
            <Reorder.Group
                as="div"
                axis="y"
                values={localOrder}
                onReorder={handleReorder}
                style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
                {localOrder.map(item => (
                    <SortableCard
                        key={item.id ?? item.content_id}
                        item={item}
                        onEdit={onEdit}
                        programTimezone={programTimezone}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    />
                ))}
            </Reorder.Group>
        </div>
    );
}

// ─── ContentList (main export) ───────────────────────────────────────────────

export default function ContentList({
    items = [],
    onEdit,
    onDelete,
    programTimezone,
    onReorder,
}: {
    items?: any[];
    onEdit?: (item: any) => void;
    onDelete?: (id: string) => void;
    programTimezone?: string;
    onReorder?: (reorderedGroupItems: any[]) => void;
}) {
    // Sort by order_index and group by date_time (to minute precision)
    const groups = useMemo(() => {
        const sorted = [...items].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
        const groupMap: Map<string, any[]> = new Map();
        for (const item of sorted) {
            const key = getGroupKey(item);
            if (!groupMap.has(key)) groupMap.set(key, []);
            groupMap.get(key)!.push(item);
        }
        return Array.from(groupMap.entries()).map(([key, groupItems]) => ({ key, groupItems }));
    }, [items]);

    return (
        <div className={styles.contentList}>
            {groups.map(({ key, groupItems }) =>
                groupItems.length > 1 ? (
                    <ReorderableGroup
                        key={key}
                        initialItems={groupItems}
                        onEdit={onEdit}
                        programTimezone={programTimezone}
                        onReorder={onReorder}
                    />
                ) : (
                    <StaticCard
                        key={key}
                        item={groupItems[0]}
                        onEdit={onEdit}
                        programTimezone={programTimezone}
                    />
                )
            )}
        </div>
    );
}
