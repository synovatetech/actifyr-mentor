import { create } from 'zustand';
import type { Program } from '@/types';

interface ProgramState {
    programDetails: Program | null;
    loading: boolean;
    error: string | null;
    activeProgramId: string | null;
    setProgramDetails: (details: Program) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setActiveProgramId: (id: string) => void;
    reset: () => void;
}

export const useProgramStore = create<ProgramState>((set) => ({
    programDetails: null,
    loading: false,
    error: null,
    activeProgramId: null,
    setProgramDetails: (details) => set({ programDetails: details, loading: false, error: null }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error, loading: false }),
    setActiveProgramId: (id) => set({ activeProgramId: id }),
    reset: () => set({ programDetails: null, loading: false, error: null, activeProgramId: null }),
}));
