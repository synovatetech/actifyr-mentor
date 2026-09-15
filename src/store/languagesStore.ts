import { create } from 'zustand';

export interface AvailableLanguage {
    id: string;
    name: string;
    nativeName: string;
}

interface LanguagesState {
    availableLanguages: AvailableLanguage[];
    loading: boolean;
    error: string | null;
    hasFetched: boolean;
    setAvailableLanguages: (languages: AvailableLanguage[]) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}

export const useLanguagesStore = create<LanguagesState>((set) => ({
    availableLanguages: [],
    loading: false,
    error: null,
    hasFetched: false,
    setAvailableLanguages: (languages) => set({ availableLanguages: languages, loading: false, hasFetched: true }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error, loading: false }),
}));
