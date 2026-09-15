'use client';

import React from 'react';
import Image from 'next/image';
import ListSkeletonLoader from '@/components/common/ListSkeletonLoader';
import styles from '@/styles/reports.module.css';

interface PerformanceReportTabProps {
  columns: string[];
  rows: Record<string, any>[];
  loading?: boolean;
  onOpenHeaders: () => void;
  onExport: () => void;
}

const COLUMN_LABELS: Record<string, string> = {
  sl_no: 'Sl No',
  participant_name: 'Participant Name',
  date_of_joining: 'Date of Joining',
  team_name: 'Team Name',
  max_points: 'Max Points',
  points_earned: 'Points Earned',
  rank: 'Rank',
  badge: 'Badge',
  learning_engagement: 'Learning Engagement',
  learning_effectiveness: 'Learning Effectiveness',
  total_task: 'Total Task',
  tasks_completed: 'Tasks Completed',
  task_pending: 'Task Pending',
  number_of_goals: 'Number of Goals',
  total_goals_completed_pct: 'Goals Completed %',
  number_of_habits: 'Number of Habits',
  total_habits_completed_pct: 'Habits Completed %',
};

const toLabel = (value: string) => {
  if (COLUMN_LABELS[value]) return COLUMN_LABELS[value];
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function PerformanceReportTab({
  columns,
  rows,
  loading = false,
  onOpenHeaders,
  onExport,
}: PerformanceReportTabProps) {
  const tableColumns =
    columns.length > 0
      ? columns
      : ['sl_no', 'participant_name', 'team_name', 'rank', 'points_earned', 'badge'];

  return (
    <>
      <div className={styles.actionRow}>
        <div />
        <div className={styles.rightActions}>
          <button className={styles.modifyBtn} onClick={onOpenHeaders}>
            Modify Report Headers
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
              {tableColumns.map((column) => (
                <th key={column}>{toLabel(column)}</th>
              ))}
            </tr>
          </thead>
          <tbody aria-busy={loading}>
            {loading ? (
              <tr>
                <td colSpan={tableColumns.length}>
                  <ListSkeletonLoader rows={8} />
                </td>
              </tr>
            ) : (
              <>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={tableColumns.length} className={styles.emptyStateCell}>
                      No performance report data found
                    </td>
                  </tr>
                )}
                {rows.map((row, idx) => (
                  <tr key={idx}>
                    {tableColumns.map((column) => (
                      <td key={`${idx}-${column}`}>
                        {row[column] ?? (column === 'sl_no' ? idx + 1 : '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
