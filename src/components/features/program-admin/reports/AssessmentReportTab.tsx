'use client';

import React from 'react';
import Image from 'next/image';
import ListSkeletonLoader from '@/components/common/ListSkeletonLoader';
import styles from '@/styles/reports.module.css';
import type {
  AssessmentDateBlock,
  AssessmentParticipantRow,
} from './reportTabs.types';

interface AssessmentReportTabProps {
  dates: AssessmentDateBlock[];
  participants: AssessmentParticipantRow[];
  loading?: boolean;
  onOpenCriteria: () => void;
  onExport: () => void;
}

const StatusIcon = ({ type, value = '' }: { type: string; value?: string }) => {
  if (type === 'check')
    return (
      <div className={styles.checkIcon}>
        <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
          <path
            d="M1 5L4.5 8.5L11 1.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );

  if (type === 'text') return <div className={styles.bIcon}>{value}</div>;
  return <div className={styles.emptyIcon} />;
};

const formatDate = (date: string) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function AssessmentReportTab({
  dates,
  participants,
  loading = false,
  onOpenCriteria,
  onExport,
}: AssessmentReportTabProps) {
  const questionColumnCount = dates.reduce((sum, current) => sum + current.questions.length, 0);
  const bodyColSpan = 2 + questionColumnCount;

  return (
    <>
      <div className={styles.actionRow}>
        <div />
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
              <th rowSpan={2} className={styles.stickyCol1}>
                Sl No
              </th>
              <th rowSpan={2} className={styles.stickyCol2}>Participant Name</th>
              {dates.map((date) => (
                <th
                  key={`${date.content_id}-${date.date}`}
                  colSpan={date.questions.length}
                  className={styles.nestedHeader}
                >
                  {formatDate(date.date)}
                </th>
              ))}
            </tr>
            <tr className={styles.subHeaderRow}>
              {dates.flatMap((date) =>
                date.questions.map((question) => (
                  <th key={`${date.content_id}-${date.date}-${question.question_no}`}>
                    {question.question_no} <span>({question.correct_option})</span>
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody aria-busy={loading}>
            {loading ? (
              <tr>
                <td colSpan={Math.max(bodyColSpan, 2)}>
                  <ListSkeletonLoader rows={8} />
                </td>
              </tr>
            ) : (
              <>
                {participants.length === 0 && (
                  <tr>
                    <td colSpan={bodyColSpan} className={styles.emptyStateCell}>
                      No assessment report data found
                    </td>
                  </tr>
                )}
                {participants.map((participant, rowIndex) => (
                  <tr key={`${participant.participant_name}-${rowIndex}`}>
                    <td className={styles.stickyCol1} style={{ color: '#6B7280' }}>{participant.sl_no || rowIndex + 1}</td>
                    <td className={styles.stickyCol2} style={{ fontWeight: 500 }}>{participant.participant_name}</td>
                    {dates.flatMap((date) => {
                      const responseByDate = participant.responses?.find(
                        (response) =>
                          String(response.content_id) === String(date.content_id) &&
                          response.date === date.date,
                      );
                      return date.questions.map((question) => {
                        const answer = responseByDate?.questions?.find(
                          (item) => item.question_no === question.question_no,
                        );
                        const type = answer?.selected_option
                          ? answer.is_correct
                            ? 'check'
                            : 'text'
                          : 'empty';

                        return (
                          <td
                            key={`${participant.participant_name}-${date.content_id}-${question.question_no}`}
                            className={styles.statusCell}
                          >
                            <StatusIcon type={type} value={answer?.selected_option || ''} />
                          </td>
                        );
                      });
                    })}
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
