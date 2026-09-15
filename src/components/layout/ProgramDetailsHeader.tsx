'use client';

import React from 'react';
import styles from '@/styles/program-details-header.module.css';
import { useProgramDetails } from '@/hooks/useProgramDetails';

export function ProgramDetailsHeader() {
    const { programDetails, loading, error, programId } = useProgramDetails();

    if (!programId) return null;

    if (loading && !programDetails) {
        return (
            <div className={styles.loading}>
                <span>Loading program details...</span>
            </div>
        );
    }

    if (error && !programDetails) {
        return null; // Don't show header if error
    }

    if (!programDetails) return null;

    // Helper to format date: 7 Oct 2025
    const formatDate = (dateStr: string | undefined) => {
        if (!dateStr) return 'N/A';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr; // fallback for non-standard formats

            const day = date.getDate();
            const month = date.toLocaleString('default', { month: 'short' });
            const year = date.getFullYear();
            return `${day} ${month} ${year}`;
        } catch (e) {
            return dateStr;
        }
    };

    // Helper to map type: scheduled_learning -> Scheduled Learning
    const formatType = (type: string | undefined) => {
        if (!type) return 'N/A';
        return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <div className={styles.programBar}>
            <span className={styles.programName}>{programDetails.title}</span>
            <span className={styles.separator}></span>
            <span className={styles.programDates}>
                Starts <strong>{formatDate(programDetails.startDate)}</strong>
                &nbsp;&nbsp;Ends <strong>{formatDate(programDetails.endDate)}</strong>
            </span>
            <span className={styles.separator}></span>
            <span className={styles.programType}>
                Program Type <strong>{formatType(programDetails.type)}</strong>
            </span>
        </div>
    );
}
