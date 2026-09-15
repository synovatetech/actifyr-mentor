'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { programsService } from '@/services/api/programs.service';
import { Program } from '@/types';
import styles from '@/styles/components/program-info-bar.module.css';

interface ProgramInfoBarProps {
    program?: Program | null;
    programId?: string;
}

export function ProgramInfoBar({ program: initialProgram, programId: initialId }: ProgramInfoBarProps) {
    const searchParams = useSearchParams();
    const [program, setProgram] = useState<Program | null>(initialProgram || null);
    const [loading, setLoading] = useState(!initialProgram);

    const programId = initialId || searchParams.get('programId');

    useEffect(() => {
        if (initialProgram) {
            setProgram(initialProgram);
            setLoading(false);
            return;
        }

        if (programId) {
            setLoading(true);
            programsService.getProgramById(programId)
                .then(res => {
                    if (res.success) {
                        setProgram(res.data);
                    }
                })
                .finally(() => setLoading(false));
        }
    }, [programId, initialProgram]);

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    if (loading) {
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
