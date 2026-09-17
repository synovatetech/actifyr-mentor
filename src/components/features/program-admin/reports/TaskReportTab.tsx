'use client';

import Image from 'next/image';
import ListSkeletonLoader from '@/components/common/ListSkeletonLoader';
import styles from '@/styles/reports.module.css';
import type { TaskReportRow } from './reportTabs.types';

interface TaskReportTabProps {
  rows: TaskReportRow[];
  loading?: boolean;
  onOpenCriteria: () => void;
  onExport: () => void;
}

const formatDate = (date: string) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function TaskReportTab({
  rows,
  loading = false,
  onOpenCriteria,
  onExport,
}: TaskReportTabProps) {
  return (
    <>
      <div className={styles.taskSelectedHeader}>
        <div className={styles.rightActions}>
          <button className={styles.criteriaBtn} onClick={onOpenCriteria}>
            Modify Criteria
          </button>
          <button className={styles.exportBtn} onClick={onExport}>
            <Image src="/excel-icon.svg" alt="Excel" width={18} height={18} />
            Export
          </button>
        </div>
      </div>

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Participant Name</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody aria-busy={loading}>
            {loading ? (
              <tr>
                <td colSpan={3}>
                  <ListSkeletonLoader rows={8} />
                </td>
              </tr>
            ) : (
              <>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={3} className={styles.emptyStateCell}>
                      No task report data found
                    </td>
                  </tr>
                )}
                {rows.map((row, index) => {
                  const isCompleted = row.completed_tasks >= row.total_tasks;
                  const taskProgress = `${row.completed_tasks} / ${row.total_tasks}`;
                  const dateLabel = row.content_title
                    ? `${row.task_date} - ${row.content_title}`
                    : formatDate(row.task_date);
                  return (
                    <tr key={`${row.participant_id}-${index}`}>
                      <td style={{ fontWeight: 500 }}>{row.participant_name}</td>
                      <td>{dateLabel}</td>
                      <td
                        className={
                          isCompleted ? styles.statusCompleted : styles.statusPending
                        }
                      >
                        {taskProgress}
                      </td>
                    </tr>
                  );
                })}
              </>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
