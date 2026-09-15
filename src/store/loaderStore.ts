import { create } from 'zustand';

interface LoaderState {
    activeRequests: number;
    text: string;
    showLoader: (text?: string) => void;
    hideLoader: () => void;
}

export const useLoaderStore = create<LoaderState>((set) => ({
    activeRequests: 0,
    text: 'Loading...',

    showLoader: (text = 'Loading...') => set((state) => ({
        activeRequests: state.activeRequests + 1,
        text
    })),

    hideLoader: () => set((state) => ({
        activeRequests: Math.max(0, state.activeRequests - 1),
    }))
}));
