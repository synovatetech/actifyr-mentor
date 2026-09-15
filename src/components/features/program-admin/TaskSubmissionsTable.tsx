"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import styles from "@/styles/submissions.module.css";
import { submissionsService } from "@/services/api/submissions.service";
import { sanitizeRichTextHtml } from "@/utils/rich-text-html";

export interface TaskGroup {
  taskId: string;
  schedule: string;
  contentTitle: string;
  description: string;
}

export interface TaskParticipant {
  id?: number;
  name: string;
  date?: string;
}

interface TaskSubmissionsTableProps {
  programId: string | number;
  onViewDetails: (submissionId: number) => void;
}

const PAGE_SIZE = 10;

function mapParticipant(p: any): TaskParticipant {
  return {
    id: Number(p.submission_id || p.id || 0) || undefined,
    name: p.participant_name || p.user_name || "Participant",
    date: p.submission_date
      ? new Date(p.submission_date).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        })
      : undefined,
  };
}

export default function TaskSubmissionsTable({
  programId,
  onViewDetails,
}: TaskSubmissionsTableProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [participantsByTask, setParticipantsByTask] = useState<
    Record<string, TaskParticipant[]>
  >({});
  const [participantsLoadingTaskId, setParticipantsLoadingTaskId] = useState<
    string | null
  >(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const tasksQuery = useInfiniteQuery({
    queryKey: ["task-submissions", programId],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await submissionsService.listTasks({
        program_id: programId,
        page: pageParam as number,
        page_size: PAGE_SIZE,
      });
      if (!res.success) throw new Error(res.error || "Failed to fetch tasks");
      return res.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage) return undefined;
      const fetched = (lastPage.page ?? 1) * (lastPage.page_size ?? PAGE_SIZE);
      return fetched < (lastPage.total ?? 0) ? (lastPage.page ?? 1) + 1 : undefined;
    },
    enabled: !!programId,
  });

  const allTasks: TaskGroup[] = useMemo(
    () =>
      tasksQuery.data?.pages.flatMap((page) =>
        (page?.tasks || []).map((item: any) => ({
          taskId: String(item.task_id || item.id || ""),
          schedule: item.schedule || "-",
          contentTitle: item.content_title || item.title || "Task Content",
          description: item.task || item.description || "",
        }))
      ) ?? [],
    [tasksQuery.data]
  );

  // Auto-select first task and pre-populate its participants from first_task_participants
  useEffect(() => {
    if (selectedTaskId || allTasks.length === 0) return;
    const firstTaskId = allTasks[0].taskId;
    setSelectedTaskId(firstTaskId);
    const firstPage = tasksQuery.data?.pages[0];
    const raw = firstPage?.first_task_participants?.participants;
    if (Array.isArray(raw) && raw.length > 0) {
      setParticipantsByTask((prev) => ({
        ...prev,
        [firstTaskId]: raw.map(mapParticipant),
      }));
    }
  }, [allTasks, selectedTaskId, tasksQuery.data]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          tasksQuery.hasNextPage &&
          !tasksQuery.isFetchingNextPage
        ) {
          tasksQuery.fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [tasksQuery.hasNextPage, tasksQuery.isFetchingNextPage, tasksQuery.fetchNextPage]);

  const handleTaskSelect = async (taskId: string) => {
    setSelectedTaskId(taskId);
    if (participantsByTask[taskId] !== undefined) return;

    setParticipantsLoadingTaskId(taskId);
    try {
      const response = await submissionsService.listTaskParticipants(taskId, programId);
      if (response.success && response.data) {
        const items = response.data.participants || response.data || [];
        setParticipantsByTask((prev) => ({
          ...prev,
          [taskId]: (Array.isArray(items) ? items : []).map(mapParticipant),
        }));
      } else {
        setParticipantsByTask((prev) => ({ ...prev, [taskId]: [] }));
      }
    } catch {
      setParticipantsByTask((prev) => ({ ...prev, [taskId]: [] }));
    } finally {
      setParticipantsLoadingTaskId(null);
    }
  };

  const selectedTask = selectedTaskId
    ? allTasks.find((g) => g.taskId === selectedTaskId)
    : null;
  const participants = selectedTaskId ? participantsByTask[selectedTaskId] ?? [] : [];
  const participantsLoading = participantsLoadingTaskId === selectedTaskId;

  if (!tasksQuery.isLoading && allTasks.length === 0) {
    return <p className={styles.noData}>No task-based submissions found.</p>;
  }

  return (
    <div
      className={`${styles.taskSplitLayout} ${
        selectedTaskId ? styles.taskSplitLayoutWithDetails : ""
      }`}
    >
      <div className={styles.taskListPane}>
        <div className={styles.taskListScrollable}>
          {tasksQuery.isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={styles.taskSkeletonCard}>
                  <div className={styles.taskSkeletonRow}>
                    <div className={styles.taskSkeletonLabel} />
                    <div className={styles.taskSkeletonValueShort} />
                  </div>
                  <div className={styles.taskSkeletonRow}>
                    <div className={styles.taskSkeletonLabel} />
                    <div className={styles.taskSkeletonValueMedium} />
                  </div>
                  <div className={styles.taskSkeletonRow}>
                    <div className={styles.taskSkeletonLabel} />
                    <div className={styles.taskSkeletonValueLong} />
                  </div>
                </div>
              ))
            : allTasks.map((group) => {
            const isSelected = selectedTaskId === group.taskId;
            return (
              <button
                key={group.taskId}
                type="button"
                className={`${styles.taskListItem} ${
                  isSelected ? styles.taskListItemSelected : ""
                }`}
                onClick={() => handleTaskSelect(group.taskId)}
              >
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Task ID</span>
                  <span className={styles.infoValue}>{group.taskId}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Content Title</span>
                  <span className={styles.infoValue}>{group.contentTitle}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Task Description</span>
                  <div
                    className={`${styles.infoValue} tiptap-rendered-content`}
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                    }}
                    dangerouslySetInnerHTML={{
                      __html: sanitizeRichTextHtml(group.description),
                    }}
                  />
                </div>
              </button>
            );
          })}

          <div ref={sentinelRef} className={styles.taskListSentinel} />


          {tasksQuery.isFetchingNextPage && (
            <div className={styles.taskLoadingMore}>
              <span className={styles.taskLoadingDot} />
              <span className={styles.taskLoadingDot} />
              <span className={styles.taskLoadingDot} />
            </div>
          )}
        </div>
      </div>

      {selectedTask && (
        <div className={styles.participantListPane}>
          {participantsLoading ? (
            <>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={styles.participantSkeletonItem}>
                  <div className={styles.participantSkeletonName} />
                  <div className={styles.participantSkeletonMeta}>
                    <div className={styles.participantSkeletonDate} />
                    <div className={styles.participantSkeletonBtn} />
                  </div>
                </div>
              ))}
            </>
          ) : participants.length > 0 ? (
            participants.map((sub, sIdx) => (
              <div key={sIdx} className={styles.participantItem}>
                <span className={styles.pName}>{sub.name}</span>
                {sub.date && (
                  <div className={styles.participantMeta}>
                    <span className={styles.pDate}>{sub.date}</span>
                    <button
                      type="button"
                      className={styles.viewActionButton}
                      onClick={() => sub.id ? onViewDetails(sub.id) : undefined}
                    >
                      View
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className={styles.noParticipants}>No submissions yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
