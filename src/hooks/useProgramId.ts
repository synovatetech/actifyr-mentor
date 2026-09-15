'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export function useProgramId(defaultId: string = '') {
    const searchParams = useSearchParams();
    const [programId, setProgramId] = useState<string>(defaultId);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // First check URL for programId
        const urlProgramId = searchParams?.get('programId');

        if (urlProgramId) {
            setProgramId(urlProgramId);
            localStorage.setItem('activeProgramId', urlProgramId);
        } else {
            // Fallback to localStorage
            const savedProgramId = localStorage.getItem('activeProgramId');
            if (savedProgramId) {
                setProgramId(savedProgramId);
            }
        }
        setIsReady(true);
    }, [searchParams]);

    return { programId, isReady };
}
