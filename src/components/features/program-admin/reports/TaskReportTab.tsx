'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import ListSkeletonLoader from '@/components/common/ListSkeletonLoader';
import styles from '@/styles/reports.module.css';
import type { TaskReportRow } from './reportTabs.types';

interface TaskReportTabProps {
  rows: TaskReportRow[];
  selectedParticipantIds: number[];
  loading?: boolean;
  onToggleAll: (checked: boolean) => void;
  onToggleParticipant: (participantId: number, checked: boolean) => void;
  onOpenCriteria: () => void;
  onSendEmailAll: () => void;
  onSendEmailSingle: (participantId: number) => void;
  onSendWhatsappAll: () => void;
  onSendWhatsappSingle: (participantId: number) => void;
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
  selectedParticipantIds,
  loading = false,
  onToggleAll,
  onToggleParticipant,
  onOpenCriteria,
  onSendEmailAll,
  onSendEmailSingle,
  onSendWhatsappAll,
  onSendWhatsappSingle,
  onExport,
}: TaskReportTabProps) {
  const selectedCount = selectedParticipantIds.length;
  const allChecked = rows.length > 0 && selectedCount === rows.length;

  const selectedParticipantsLabel = useMemo(() => {
    return `Participant${selectedCount === 1 ? '' : 's'}`;
  }, [selectedCount]);

  return (
    <>
      <div className={styles.taskSelectedHeader}>
        <span className={styles.taskSelectedText}>
          You’ve selected{" "}
          <span className={styles.taskSelectedCount}>{selectedCount}</span>{" "}
          {selectedParticipantsLabel}
        </span>
        <div className={styles.taskSelectedActions}>
          <button
            className={styles.whatsappBtn}
            disabled={selectedCount === 0}
            onClick={onSendWhatsappAll}
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12.031 2C6.546 2 2.041 6.505 2.041 11.99C2.041 13.754 2.501 15.41 3.3 16.857L2 22l5.242-1.378c1.408.767 3.012 1.205 4.717 1.205 5.484 0 9.989-4.505 9.989-9.99C21.948 6.505 17.516 2 12.031 2z"
                fill="#25D366"
              />
              <path
                d="M17.472 14.382c-.301-.15-1.767-.872-2.04-.971-.272-.1-.47-.15-.667.15-.198.3-.767.971-.94 1.169-.173.199-.347.225-.648.075-.301-.15-1.27-.47-2.42-1.493-.894-.798-1.502-1.782-1.677-2.081-.174-.3-.018-.465.132-.614.135-.133.301-.351.452-.525.151-.175.201-.299.301-.5.1-.199.05-.375-.025-.525-.075-.15-.667-1.608-.915-2.203-.241-.58-.485-.502-.667-.511-.173-.008-.371-.01-.57-.01-.197 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.063 2.875 1.211 3.074.149.198 2.095 3.198 5.074 4.486.708.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.767-.721 2.016-1.416.248-.696.248-1.292.174-1.417-.074-.124-.272-.198-.57-.348z"
                fill="white"
              />
            </svg>
            Whatsapp All
          </button>
          <button
            className={styles.emailBtn}
            disabled={selectedCount === 0}
            onClick={onSendEmailAll}
          >
            <Image src="/gmail_icon.svg" alt="Email" width={16} height={16} />
            Send Email to All
          </button>
        </div>
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
              <th style={{ width: '40px' }}>
                <input
                  type="checkbox"
                  className={styles.checkboxInput}
                  checked={allChecked}
                  onChange={(event) => onToggleAll(event.target.checked)}
                />
              </th>
              <th>Participant Name</th>
              <th>Date</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Send Notification</th>
            </tr>
          </thead>
          <tbody aria-busy={loading}>
            {loading ? (
              <tr>
                <td colSpan={5}>
                  <ListSkeletonLoader rows={8} />
                </td>
              </tr>
            ) : (
              <>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className={styles.emptyStateCell}>
                      No task report data found
                    </td>
                  </tr>
                )}
                {rows.map((row, index) => {
                  const isCompleted = row.completed_tasks >= row.total_tasks;
                  const isChecked = selectedParticipantIds.includes(row.participant_id);
                  const taskProgress = `${row.completed_tasks} / ${row.total_tasks}`;
                  const dateLabel = row.content_title
                    ? `${row.task_date} - ${row.content_title}`
                    : formatDate(row.task_date);
                  return (
                    <tr key={`${row.participant_id}-${index}`}>
                      <td>
                        <input
                          type="checkbox"
                          className={styles.checkboxInput}
                          checked={isChecked}
                          onChange={(event) =>
                            onToggleParticipant(row.participant_id, event.target.checked)
                          }
                        />
                      </td>
                      <td style={{ fontWeight: 500 }}>{row.participant_name}</td>
                      <td>{dateLabel}</td>
                      <td
                        className={
                          isCompleted ? styles.statusCompleted : styles.statusPending
                        }
                      >
                        {taskProgress}
                      </td>
                      <td className={styles.notificationCell}>
                        <button
                          className={styles.whatsappBtn}
                          onClick={() => onSendWhatsappSingle(row.participant_id)}
                          type="button"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M12.031 2C6.546 2 2.041 6.505 2.041 11.99C2.041 13.754 2.501 15.41 3.3 16.857L2 22l5.242-1.378c1.408.767 3.012 1.205 4.717 1.205 5.484 0 9.989-4.505 9.989-9.99C21.948 6.505 17.516 2 12.031 2z"
                              fill="#25D366"
                            />
                            <path
                              d="M17.472 14.382c-.301-.15-1.767-.872-2.04-.971-.272-.1-.47-.15-.667.15-.198.3-.767.971-.94 1.169-.173.199-.347.225-.648.075-.301-.15-1.27-.47-2.42-1.493-.894-.798-1.502-1.782-1.677-2.081-.174-.3-.018-.465.132-.614.135-.133.301-.351.452-.525.151-.175.201-.299.301-.5.1-.199.05-.375-.025-.525-.075-.15-.667-1.608-.915-2.203-.241-.58-.485-.502-.667-.511-.173-.008-.371-.01-.57-.01-.197 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.063 2.875 1.211 3.074.149.198 2.095 3.198 5.074 4.486.708.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.767-.721 2.016-1.416.248-.696.248-1.292.174-1.417-.074-.124-.272-.198-.57-.348z"
                              fill="white"
                            />
                          </svg>
                          Whatsapp
                        </button>
                        <button
                          className={styles.emailBtn}
                          onClick={() => onSendEmailSingle(row.participant_id)}
                        >
                          <Image src="/gmail_icon.svg" alt="Email" width={16} height={16} />
                          Send Email
                        </button>
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
