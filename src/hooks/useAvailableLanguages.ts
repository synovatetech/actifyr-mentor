'use client';

import { useCallback, useEffect } from 'react';
import { useLanguagesStore } from '@/store/languagesStore';
import { languagesService } from '@/services/api/languages.service';

/** Program-selectable languages, fetched once per session and cached in Zustand.
 *  English is the base language and is excluded — every consumer treats it as
 *  the always-present default tab, not a selectable translation. */
export function useAvailableLanguages() {
    const availableLanguages = useLanguagesStore(state => state.availableLanguages);
    const loading = useLanguagesStore(state => state.loading);
    const error = useLanguagesStore(state => state.error);
    const setAvailableLanguages = useLanguagesStore(state => state.setAvailableLanguages);
    const setLoading = useLanguagesStore(state => state.setLoading);
    const setError = useLanguagesStore(state => state.setError);

    const fetchLanguages = useCallback(async (force = false) => {
        // Read current store state directly to avoid stale closure deps
        const { hasFetched } = useLanguagesStore.getState();
        if (hasFetched && !force) return;

        setLoading(true);
        try {
            const res = await languagesService.list();
            if (res.success && Array.isArray(res.data?.languages)) {
                setAvailableLanguages(
                    res.data.languages
                        .filter((l: any) => l.language_code !== 'en')
                        .map((l: any) => ({
                            id: l.language_code,
                            name: l.name,
                            nativeName: l.native_name,
                        })),
                );
            } else {
                setError(res.error || 'Failed to load languages');
            }
        } catch (err) {
            setError('An error occurred while fetching languages');
        } finally {
            setLoading(false);
        }
    }, [setAvailableLanguages, setError, setLoading]);

    useEffect(() => {
        fetchLanguages();
    }, [fetchLanguages]);

    return {
        availableLanguages,
        loading,
        error,
        refetch: () => fetchLanguages(true),
    };
}
