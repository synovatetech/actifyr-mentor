// ============================================
// Shared multi-language config for Program forms
// Used by both Edit Program and Duplicate Program
// ============================================

export type LangTranslation = {
  title: string;
  description: string;
  companyName: string;
  facilitatorName: string;
  programLogo: File | null;
  programLogoPreview: string | null;
  notifications: Array<{ content: string }>;
  performanceIndicator1: string;
  performanceIndicator2: string;
};

export const emptyLangTranslation = (
  notifications: Array<{ content: string }>,
): LangTranslation => ({
  title: "",
  description: "",
  companyName: "",
  facilitatorName: "",
  programLogo: null,
  programLogoPreview: null,
  notifications: notifications.map(() => ({ content: "" })),
  performanceIndicator1: "",
  performanceIndicator2: "",
});

/** Seeds selectedLanguages/languageTranslations state from a Program API response. */
export function buildLanguageState(
  p: { languages?: string[]; translations?: any[] },
  notifications: Array<{ content: string }>,
): { selectedLanguages: string[]; languageTranslations: Record<string, LangTranslation> } {
  const selectedLanguages: string[] = Array.isArray(p.languages) ? p.languages : [];
  const languageTranslations: Record<string, LangTranslation> = {};

  selectedLanguages.forEach((langCode) => {
    const t = (p.translations || []).find((x: any) => x.language_code === langCode);
    languageTranslations[langCode] = {
      title: t?.title || "",
      description: t?.description || "",
      companyName: t?.company_name || "",
      facilitatorName: t?.facilitator_name || "",
      programLogo: null,
      programLogoPreview: null,
      notifications: notifications.map((_, i) => ({
        content: i === 0 ? (t?.notification_content || "") : (t?.notification_content_two || ""),
      })),
      performanceIndicator1: t?.pi_1_title || "",
      performanceIndicator2: t?.pi_2_title || "",
    };
  });

  return { selectedLanguages, languageTranslations };
}
