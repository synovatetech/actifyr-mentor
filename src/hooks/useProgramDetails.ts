'use client';

import { useCallback, useEffect } from 'react';
import { useProgramId } from './useProgramId';
import { useProgramStore } from '@/store/programStore';
import { programsService } from '@/services/api/programs.service';
import { errorToast } from '@/utils/toast';

// Module-level (not per-hook-instance) so two components mounting at the same
// time — e.g. ReportsContent calling this hook directly while also rendering
// <ProgramInfoBar />, which calls it too — share one in-flight request instead
// of both firing before either has written `programDetails` to the store.
let inFlightFetch: { id: string; promise: Promise<void> } | null = null;

export function useProgramDetails() {
    const { programId, isReady } = useProgramId();
    const programDetails = useProgramStore(state => state.programDetails);
    const loading = useProgramStore(state => state.loading);
    const error = useProgramStore(state => state.error);
    const setProgramDetails = useProgramStore(state => state.setProgramDetails);
    const setLoading = useProgramStore(state => state.setLoading);
    const setError = useProgramStore(state => state.setError);
    const setActiveProgramId = useProgramStore(state => state.setActiveProgramId);

    const fetchDetails = useCallback(async (id: string, force = false) => {
        if (!id) return;

        // Read current store state directly to avoid stale closure deps
        const { programDetails: pd, activeProgramId } = useProgramStore.getState();
        if (pd && activeProgramId === id && !force) return;

        if (!force && inFlightFetch && inFlightFetch.id === id) {
            return inFlightFetch.promise;
        }

        const promise = (async () => {
            setLoading(true);
            try {
                const res = await programsService.getProgramById(id);
                if (res.success && res.data) {
                    setProgramDetails(res.data);
                    setActiveProgramId(id);
                } else {
                    const message = res.error || 'Failed to fetch program details';
                    setError(message);
                    errorToast(message);
                }
            } catch (err) {
                const message = 'An error occurred while fetching program details';
                setError(message);
                errorToast(message);
            } finally {
                setLoading(false);
            }
        })();

        inFlightFetch = { id, promise };
        try {
            await promise;
        } finally {
            if (inFlightFetch?.promise === promise) {
                inFlightFetch = null;
            }
        }
    }, [setProgramDetails, setLoading, setError, setActiveProgramId]);

    useEffect(() => {
        if (isReady && programId) {
            fetchDetails(programId);
        }
    }, [isReady, programId, fetchDetails]);

    return {
        programDetails,
        loading,
        error,
        isReady,
        programId,
        refetch: () => fetchDetails(programId, true)
    };
}
