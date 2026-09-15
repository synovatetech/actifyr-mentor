'use client';

import { useQuery } from '@tanstack/react-query';
import {
    missingTranslationsService,
    type MissingTranslationsResponse,
} from '@/services/api/missingTranslations.service';

export const missingTranslationsKeys = {
    content: (contentId: string | number) => ['missingTranslations', 'content', String(contentId)] as const,
    program: (programId: string | number) => ['missingTranslations', 'program', String(programId)] as const,
};

export function useContentMissingTranslations(
    contentId: string | number | null | undefined,
    enabled = true,
) {
    return useQuery({
        queryKey: missingTranslationsKeys.content(contentId ?? ''),
        queryFn: async () => {
            const res = await missingTranslationsService.getForContent(contentId as string | number);
            if (!res.success) throw new Error(res.error || 'Failed to load content translation status');
            return res.data;
        },
        enabled: enabled && !!contentId,
        staleTime: 30 * 1000,
    });
}

export function useProgramMissingTranslations(
    programId: string | number | null | undefined,
    enabled = true,
) {
    return useQuery({
        queryKey: missingTranslationsKeys.program(programId ?? ''),
        queryFn: async () => {
            const res = await missingTranslationsService.getForProgram(programId as string | number);
            if (!res.success) throw new Error(res.error || 'Failed to load program translation status');
            return res.data;
        },
        enabled: enabled && !!programId,
        staleTime: 30 * 1000,
    });
}

/** True when any non-English language is missing at least one of the given `missing.*` id-list fields. */
export function hasMissingTranslationInFields(
    data: MissingTranslationsResponse | null | undefined,
    fields: string[],
): boolean {
    if (!data) return false;
    return data.languages.some((lang) => {
        if (lang.language_code === 'en' || lang.is_complete) return false;
        return fields.some((field) => {
            const value = lang.missing?.[field];
            return Array.isArray(value) ? value.length > 0 : !!value;
        });
    });
}

/** True when the given language is missing at least one of the given `missing.*` id-list fields. */
export function isLanguageMissingField(
    data: MissingTranslationsResponse | null | undefined,
    languageCode: string,
    field: string,
): boolean {
    const lang = data?.languages.find((l) => l.language_code === languageCode);
    if (!lang) return false;
    const value = lang.missing?.[field];
    return Array.isArray(value) ? value.length > 0 : !!value;
}

/** Per-category id-list field on ProgramTranslationMissingDetail, keyed by GeneralContentTabs' tab id. */
export const GENERAL_CONTENT_TRANSLATION_FIELDS: Record<string, string> = {
    'knowledge-cards': 'knowledge_card_ids',
    goals: 'goal_ids',
    habits: 'habit_ids',
    resources: 'resource_ids',
    workbook: 'workbook_ids',
    quotes: 'quote_ids',
};

export const NOTIFICATION_TRANSLATION_FIELDS = ['custom_notification_ids', 'popup_notification_ids'];

export const PRIVACY_POLICY_TRANSLATION_FIELD = 'privacy_policy_ids';
