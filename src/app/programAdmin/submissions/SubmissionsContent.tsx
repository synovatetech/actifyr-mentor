'use client';

import React, { useState, Suspense } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useProgramId } from '@/hooks/useProgramId';
import { useProgramStore } from '@/store/programStore';
import styles from '@/styles/submissions.module.css';
import { ProgramInfoBar } from '@/components/features/program-admin/ProgramInfoBar';
import { submissionsService } from '@/services/api/submissions.service';
import { PageLoader } from '@/components/ui/Loader';
import GeneralSubmissionsTable from '@/components/features/program-admin/GeneralSubmissionsTable';
import TaskSubmissionsTable from '@/components/features/program-admin/TaskSubmissionsTable';
import SubmissionDetailsModal from '@/components/features/program-admin/SubmissionDetailsModal';
import type { SubmissionDetails } from '@/components/features/program-admin/SubmissionDetailsModal';

export default function SubmissionsContent() {
    return (
        <Suspense fallback={<PageLoader />}>
            <SubmissionsInner />
        </Suspense>
    );
}

function SubmissionsInner() {
    const { programId } = useProgramId();
    const timeZone = useProgramStore((s) => s.programDetails?.timeZone);
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<'General' | 'Tasks'>('General');
    const [searchTerm, setSearchTerm] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [selectedDetails, setSelectedDetails] = useState<SubmissionDetails | null>(null);

    const formatDateTime = (value?: string) => {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            ...(timeZone ? { timeZone } : {}),
        });
    };

    const openDetailsModal = async (submissionId: number) => {
        setIsModalOpen(true);
        setModalLoading(true);
        try {
            const response = await submissionsService.getDetails(submissionId);
            if (!response.success || !response.data) {
                setSelectedDetails(null);
                return;
            }
            const d = response.data;
            setSelectedDetails({
                id: d.id,
                participant: d.participant_name || '-',
                subject: d.subject || '-',
                message: d.message || '-',
                status: d.status || '',
                submittedOn: formatDateTime(d.submitted_on),
                files: Array.isArray(d.files)
                    ? d.files.map((f: any) => ({
                          id: f.id,
                          fileName: f.file_name || 'File',
                          path: f.path || '',
                      }))
                    : [],
            });
        } catch {
            setSelectedDetails(null);
        } finally {
            setModalLoading(false);
        }
    };

    if (!programId) {
        return (
            <div className={styles.container}>
                Please select a program to view submissions.
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <ProgramInfoBar />

            <div className={styles.contentWrapper}>
                <div className={styles.tabContainer}>
                    <button
                        className={`${styles.tab} ${activeTab === 'General' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('General')}
                    >
                        General Submissions
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'Tasks' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('Tasks')}
                    >
                        Tasks based Submissions
                    </button>
                </div>

                <div className={styles.actionRow}>
                    <div className={styles.searchBox}>
                        <input
                            className={styles.searchInput}
                            placeholder="Search by Participant Name"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button className={styles.searchBtn} type="button">
                            Search
                        </button>
                    </div>
                </div>

                <div className={styles.tableCard}>
                    {activeTab === 'General' ? (
                        <GeneralSubmissionsTable
                            programId={programId}
                            searchTerm={searchTerm}
                            timeZone={timeZone}
                            onViewDetails={openDetailsModal}
                        />
                    ) : (
                        <TaskSubmissionsTable
                            programId={programId}
                            onViewDetails={openDetailsModal}
                        />
                    )}
                </div>
            </div>

            <SubmissionDetailsModal
                isOpen={isModalOpen}
                loading={modalLoading}
                details={selectedDetails}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedDetails(null);
                    if (activeTab === 'General') {
                        queryClient.invalidateQueries({ queryKey: ['general-submissions'] });
                    }
                }}
            />
        </div>
    );
}
