"use client";

import { useState, useEffect, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import styles from '@/styles/support.module.css';
import { supportService } from '@/services/api/support.service';
import { PageLoader } from '@/components/ui/Loader';
import { errorToast } from '@/utils/toast';

interface SupportTicket {
    id: string | number;
    ref_id?: string;
    ticket_id?: string;
    received_on?: string;
    created_on?: string;
    created_at?: string;
    sender_name?: string;
    created_by?: string;
    user_name?: string;
    participant_email?: string;
    sender_email?: string;
    user_email?: string;
    program_name?: string;
    program?: string;
    status: string;
    attachment?: string;
    title?: string;
    message?: string;
    subject?: string;
    body?: string;
    response?: string;
    response_body?: string;
}

function SupportContent() {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [totalTickets, setTotalTickets] = useState(0);
    const [resolvedTickets, setResolvedTickets] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('All Status');
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const res = await supportService.list();
            if (res.success && res.data) {
                const items: SupportTicket[] = Array.isArray(res.data.items)
                    ? res.data.items
                    : Array.isArray(res.data.tickets)
                        ? res.data.tickets
                        : Array.isArray(res.data)
                            ? res.data
                            : [];
                setTickets(items);
                setTotalTickets(res.data.total ?? 0);
                setResolvedTickets(res.data.resolved_tickets ?? 0);
            } else {
                errorToast(res.error || 'Failed to fetch support tickets');
            }
        } catch (err) {
            errorToast('An error occurred while fetching support tickets');
        } finally {
            setLoading(false);
        }
    };

    const filteredTickets = tickets.filter(t => {
        if (filterStatus === 'All Status') return true;
        return (t.status || '').toLowerCase() === filterStatus.toLowerCase();
    });

    const openCount = totalTickets - resolvedTickets;

    const handleRowClick = async (ticket: SupportTicket) => {
        setDetailLoading(true);
        try {
            const res = await supportService.get(ticket.id);
            if (res.success && res.data) {
                const detail = res.data.ticket ?? res.data.item ?? res.data;
                setSelectedTicket(detail);
            } else {
                // fallback to list data
                errorToast(res.error || 'Failed to fetch full ticket details — showing summary data');
                setSelectedTicket(ticket);
            }
        } catch (err) {
            errorToast('An error occurred while fetching ticket details — showing summary data');
            setSelectedTicket(ticket);
        } finally {
            setDetailLoading(false);
        }
    };

    const closeModal = () => {
        setSelectedTicket(null);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric'
            });
        } catch {
            return dateStr;
        }
    };

    const formatDateTime = (dateStr?: string) => {
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

    // Helpers to read flexible field names
    const getRefId = (t: SupportTicket) => t.ref_id || t.ticket_id || String(t.id);
    const getDate = (t: SupportTicket) => t.received_on || t.created_on || t.created_at || '';
    const getName = (t: SupportTicket) => t.sender_name || t.created_by || t.user_name || '';
    const getEmail = (t: SupportTicket) => t.participant_email || t.sender_email || t.user_email || '';
    const getProgram = (t: SupportTicket) => t.program_name || t.program || '';
    const getMessage = (t: SupportTicket) => t.message || t.title || t.subject || t.body || '';
    const getResponse = (t: SupportTicket) => t.response || t.response_body || '';
    const isOpen = (t: SupportTicket) => ['open', 'new', 'pending'].includes((t.status || '').toLowerCase());

    if (loading) return <PageLoader />;

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.header}>
                <h1 className={styles.pageTitle}>Support Requests</h1>
            </div>

            <div className={styles.statsSection}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Total Tickets Received</span>
                    <span className={styles.statValue}>{totalTickets}</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Open Tickets</span>
                    <span className={`${styles.statValue} ${openCount > 0 ? styles.statValueRed : ''}`}>
                        {openCount}
                    </span>
                </div>

                <select
                    className={styles.filterSelect}
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                >
                    <option value="All Status">All Status</option>
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                </select>
            </div>

            <div className={styles.supportSection}>
                {tickets.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p className={styles.emptyStateText}>You have not received any support tickets yet</p>
                    </div>
                ) : (
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Support ID</th>
                                    <th>Received On</th>
                                    <th>Sender Name</th>
                                    <th>Email Address</th>
                                    <th>Program</th>
                                    <th>Status</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTickets.map((ticket) => (
                                    <tr
                                        key={ticket.id}
                                        className={`${styles.tableRow} ${isOpen(ticket) ? styles.open : ''}`}
                                        onClick={() => handleRowClick(ticket)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td>{getRefId(ticket)}</td>
                                        <td>{formatDate(getDate(ticket))}</td>
                                        <td>{getName(ticket)}</td>
                                        <td>{getEmail(ticket)}</td>
                                        <td>{getProgram(ticket)}</td>
                                        <td className={isOpen(ticket) ? styles.statusOpen : styles.statusClosed}>
                                            {isOpen(ticket) ? 'Open' : 'Closed'}
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

            {/* Ticket Detail Modal */}
            {selectedTicket && mounted && !detailLoading && createPortal(
                <div className={styles.modalOverlay} onClick={closeModal}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>Support Ticket Details</h2>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', gap: '40px' }}>
                                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                                    <span className={styles.detailLabel}>Support ID</span>
                                    <span className={styles.detailValue}>{getRefId(selectedTicket)}</span>

                                    <span className={styles.detailLabel}>Sender Name</span>
                                    <span className={styles.detailValue}>{getName(selectedTicket)}</span>

                                    <span className={styles.detailLabel}>Program</span>
                                    <span className={styles.detailValue} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '280px' }}>
                                        {getProgram(selectedTicket)}
                                    </span>

                                    <span className={styles.detailLabel}>Attachment</span>
                                    <span className={styles.detailValue}>
                                        {selectedTicket.attachment ? (
                                            <a href={selectedTicket.attachment} target="_blank" rel="noreferrer" className={styles.attachmentLink}>
                                                {selectedTicket.attachment.split('/').pop()}
                                            </a>
                                        ) : 'None'}
                                    </span>
                                </div>

                                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', alignContent: 'start' }}>
                                    <span className={styles.detailLabel}>Received On</span>
                                    <span className={styles.detailValue}>{formatDateTime(getDate(selectedTicket))}</span>

                                    <span className={styles.detailLabel}>Sender Email</span>
                                    <span className={styles.detailValue}>{getEmail(selectedTicket)}</span>

                                    <span className={styles.detailLabel}>Status</span>
                                    <span className={isOpen(selectedTicket) ? styles.statusOpen : styles.statusClosed}>
                                        {isOpen(selectedTicket) ? 'Open' : 'Closed'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Original message */}
                        <div className={styles.responseSection} style={{ marginBottom: '16px' }}>
                            <label className={styles.responseLabel}>Message</label>
                            <textarea
                                readOnly
                                className={styles.messageBox}
                                value={getMessage(selectedTicket) || 'No message provided'}
                            />
                        </div>

                        {/* Existing response (if any) */}
                        {getResponse(selectedTicket) && (
                            <div className={styles.responseSection} style={{ marginBottom: '16px' }}>
                                <label className={styles.responseLabel}>Previous Response</label>
                                <textarea
                                    readOnly
                                    className={styles.messageBox}
                                    value={getResponse(selectedTicket)}
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

export default function SupportPage() {
    return (
        <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
                <SupportContent />
            </Suspense>
        </DashboardLayout>
    );
}
