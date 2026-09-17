"use client";

import { useState, useEffect, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import styles from '@/styles/feedbacks.module.css';
import { feedbackService, FeedbackItem, FeedbackDetail } from '@/services/api/feedback.service';
import { PageLoader } from '@/components/ui/Loader';
import { errorToast } from '@/utils/toast';

function FeedbacksContent() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('All Status');
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const res = await feedbackService.list();
      if (res.success && res.data) {
        setFeedbacks(res.data);
      } else {
        errorToast(res.error || 'Failed to fetch feedbacks');
      }
    } catch (err) {
      errorToast('An error occurred while fetching feedbacks');
    } finally {
      setLoading(false);
    }
  };

  const filteredFeedbacks = feedbacks.filter(f => {
    if (filterStatus === 'All Status') return true;
    if (filterStatus === 'Unread') return f.status === 'unread';
    if (filterStatus === 'Read') return f.status === 'read';
    return true;
  });

  const unreadCount = feedbacks.filter(f => f.status === 'unread').length;

  const handleRowClick = async (feedback: FeedbackItem) => {
    setDetailLoading(true);
    try {
      const res = await feedbackService.getDetail(feedback.id);
      if (res.success && res.data) {
        setSelectedFeedback(res.data);
        // Mark as read locally once viewed
        setFeedbacks(prev =>
          prev.map(f => f.id === feedback.id ? { ...f, status: 'read' } : f)
        );
      } else {
        errorToast(res.error || 'Failed to fetch feedback details');
      }
    } catch (err) {
      errorToast('An error occurred while fetching feedback details');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedFeedback(null);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill={star <= rating ? "currentColor" : "none"}
            className={star <= rating ? "" : styles.starEmpty}
          >
            <path
              d="M8 0L9.79611 5.52786H15.6085L10.9062 8.94427L12.7023 14.4721L8 11.0557L3.29772 14.4721L5.09383 8.94427L0.391548 5.52786H6.20389L8 0Z"
              fill="currentColor"
            />
          </svg>
        ))}
      </div>
    );
  };

  if (loading) return <PageLoader />;

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Feedback from Participants</h1>
      </div>

      <div className={styles.statsSection}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Feedback Received</span>
          <span className={styles.statValue}>{feedbacks.length}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Unread Feedbacks</span>
          <span className={`${styles.statValue} ${unreadCount > 0 ? styles.statValueRed : ''}`}>
            {unreadCount}
          </span>
        </div>

        <select
          className={styles.filterSelect}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="All Status">All Status</option>
          <option value="Unread">Unread</option>
          <option value="Read">Read</option>
        </select>
      </div>

      <div className={styles.feedbacksSection}>
        {feedbacks.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyStateText}>You have not received any feedbacks yet</p>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Feedback ID</th>
                  <th>Received On</th>
                  <th>Sender Name</th>
                  <th>Email Address</th>
                  <th>Program</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredFeedbacks.map((feedback) => (
                  <tr
                    key={feedback.id}
                    className={`${styles.tableRow} ${feedback.status === 'unread' ? styles.unread : ''}`}
                    onClick={() => handleRowClick(feedback)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{feedback.ref_id}</td>
                    <td>{formatDate(feedback.received_on)}</td>
                    <td>{feedback.sender_name}</td>
                    <td>{feedback.sender_email}</td>
                    <td className={styles.programCell}>{feedback.program_name}</td>
                    <td className={feedback.status === 'unread' ? styles.statusUnread : styles.statusRead}>
                      {feedback.status === 'unread' ? 'Unread' : 'Read'}
                    </td>
                    <td className={styles.chevronCell}>
                      <svg width="6" height="10" viewBox="0 0 6 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 9L5 5L1 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail loading overlay */}
      {detailLoading && mounted && createPortal(
        <div className={styles.modalOverlay} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PageLoader />
        </div>,
        document.body
      )}

      {/* Feedback Detail Modal */}
      {selectedFeedback && mounted && !detailLoading && createPortal(
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Feedback Details</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '40px' }}>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px' }}>
                  <span className={styles.detailLabel}>Feedback ID</span>
                  <span className={styles.detailValue}>{selectedFeedback.ref_id || selectedFeedback.id}</span>

                  <span className={styles.detailLabel}>Sender Name</span>
                  <span className={styles.detailValue}>{selectedFeedback.sender_name}</span>

                  <span className={styles.detailLabel}>Program</span>
                  <span className={styles.detailValue} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
                    {selectedFeedback.program_name}
                  </span>
                </div>

                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px' }}>
                  <span className={styles.detailLabel}>Received On</span>
                  <span className={styles.detailValue}>{formatDateTime(selectedFeedback.received_on)}</span>

                  <span className={styles.detailLabel}>Sender Email</span>
                  <span className={styles.detailValue}>{selectedFeedback.sender_email}</span>
                </div>
              </div>
            </div>

            <div className={styles.feedbackSection}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Feedback on Course</h3>
                {renderStars(selectedFeedback.rating_for_program || 0)}
              </div>
              <textarea
                readOnly
                className={styles.feedbackBox}
                value={selectedFeedback.feedback_for_program || ""}
                placeholder="No feedback provided"
              />
            </div>

            {/* Feedback about the trainer personally is withheld from mentors —
                the API returns rating_for_trainer/feedback_for_trainer as null,
                so this block only renders when that data is actually present. */}
            {(selectedFeedback.rating_for_trainer != null ||
              selectedFeedback.feedback_for_trainer != null) && (
              <div className={styles.feedbackSection}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>Feedback on Trainer</h3>
                  {renderStars(selectedFeedback.rating_for_trainer || 0)}
                </div>
                <textarea
                  readOnly
                  className={styles.feedbackBox}
                  value={selectedFeedback.feedback_for_trainer || ""}
                  placeholder="No feedback provided"
                />
              </div>
            )}

            <div className={styles.modalFooter}>
              <button className={styles.closeButton} onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default function FeedbacksPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<PageLoader />}>
        <FeedbacksContent />
      </Suspense>
    </DashboardLayout>
  );
}
