'use client';

import { useProgramDetails } from '@/hooks/useProgramDetails';
import styles from '@/styles/components/program-info-bar.module.css';

// Backed by useProgramStore (Zustand), which is a module-level singleton, so
// this is shared across every programAdmin/* route. useProgramDetails only
// re-fetches when the programId actually changes — switching tabs remounts
// this component but must NOT trigger a new API call for the same program.
export function ProgramInfoBar() {
    const { programDetails: program, loading } = useProgramDetails();

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    if (loading && !program) {
        return (
            <div className={styles.programBar}>
                <span>Loading Program Details...</span>
            </div>
        );
    }

    if (!program) {
        return (
            <div className={styles.programBar}>
                <span>Select a program to view details</span>
            </div>
        );
    }

    return (
        <div className={styles.programBar}>
            <span className={styles.programName}>{program.title}</span>
            <span className={styles.separator}></span>
            <span className={styles.programDate}>
                Starts <strong>{formatDate(program.startDate)}</strong> &nbsp;&nbsp;Ends <strong>{formatDate(program.endDate)}</strong>
            </span>
            <span className={styles.separator}></span>
            <span className={styles.programType}>Program Type <strong>{program.duration || 'Standard'}</strong></span>
        </div>
    );
}
