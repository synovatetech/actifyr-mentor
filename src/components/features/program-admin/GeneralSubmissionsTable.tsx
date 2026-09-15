"use client";

import React, { useEffect, useRef, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import styles from "@/styles/submissions.module.css";
import { submissionsService } from "@/services/api/submissions.service";
import { PageLoader } from "@/components/ui/Loader";

export interface GeneralSubmissionRow {
  id: number;
  submittedOn: string;
  participant: string;
  subject: string;
  isNew: boolean;
}

interface GeneralSubmissionsTableProps {
  programId: string | number;
  searchTerm: string;
  timeZone?: string;
  onViewDetails: (id: number) => void;
}

const PAGE_SIZE = 10;

function formatDate(value?: string, timeZone?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(timeZone ? { timeZone } : {}),
  });
}

export default function GeneralSubmissionsTable({
  programId,
  searchTerm,
  timeZone,
  onViewDetails,
}: GeneralSubmissionsTableProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const query = useInfiniteQuery({
    queryKey: ["general-submissions", programId, searchTerm],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await submissionsService.listGeneral({
        program_id: programId,
        page: pageParam as number,
        page_size: PAGE_SIZE,
        ...(searchTerm.trim() ? { search_text: searchTerm.trim() } : {}),
      });
      if (!res.success) throw new Error(res.error || "Failed to fetch submissions");
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

  const allRows: GeneralSubmissionRow[] = useMemo(
    () =>
      query.data?.pages.flatMap((page) => {
        const items = Array.isArray(page)
          ? page
          : page?.submissions || page?.items || [];
        return (Array.isArray(items) ? items : []).map((item: any) => ({
          id: item.id,
          submittedOn: formatDate(item.submitted_on, timeZone),
          participant: item.participant_name || item.user_name || "Participant",
          subject: item.subject || item.title || "Submission",
          isNew: item.status === "unread",
        }));
      }) ?? [],
    [query.data, timeZone]
  );

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          query.hasNextPage &&
          !query.isFetchingNextPage
        ) {
          query.fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  if (query.isLoading) {
    return <PageLoader />;
  }

  return (
    <div className={styles.generalScrollable}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th style={{ width: "20%" }}>Submitted On</th>
            <th style={{ width: "22%" }}>Participant</th>
            <th style={{ width: "36%" }}>Subject</th>
            <th style={{ width: "12%" }} />
          </tr>
        </thead>
        <tbody>
          {allRows.length > 0 ? (
            allRows.map((item) => (
              <tr
                key={item.id}
                className={`${styles.tableRow} ${item.isNew ? styles.rowHighlight : ""}`}
              >
                <td>{item.submittedOn}</td>
                <td style={{ fontWeight: 500 }}>{item.participant}</td>
                <td>{item.subject}</td>
                <td>
                  <button
                    type="button"
                    className={styles.viewDetailsButton}
                    onClick={() => onViewDetails(item.id)}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} style={{ textAlign: "center", padding: "2rem" }}>
                No general submissions found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div ref={sentinelRef} className={styles.taskListSentinel} />

      {query.isFetchingNextPage && (
        <div className={styles.taskLoadingMore}>
          <span className={styles.taskLoadingDot} />
          <span className={styles.taskLoadingDot} />
          <span className={styles.taskLoadingDot} />
        </div>
      )}
    </div>
  );
}
