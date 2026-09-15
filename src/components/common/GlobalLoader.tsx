'use client';

import React from 'react';
import { PageLoader } from '@/components/ui/Loader';
import { useLoaderStore } from '@/store/loaderStore';

export function GlobalLoader() {
    const { activeRequests, text } = useLoaderStore();
    const isActive = activeRequests > 0;

    return null; /* Replace GlobalLoader with pure NProgress handled in apiClient */
}
