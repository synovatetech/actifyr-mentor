"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useClientAdmin } from "@/hooks/useClientAdmin";
import { useToast } from "@/context/ToastContext";
import { formatTimeZoneLabel, getAllTimeZones, getTodayDateString as getTodayString, getUserTimeZone } from "@/utils/date-time";
import styles from "@/styles/create-program.module.css";
import { DuplicateProgramSkeleton } from "./DuplicateProgramSkeleton";
import { ContentScheduleSection } from "./ContentScheduleSection";
import {
  CopyProgramContentSection,
  DEFAULT_COPY_CONTENT,
  type CopyContentKey,
  type CopyContentState,
} from "./CopyProgramContentSection";
import {
  useSourceProgram,
  useDuplicateProgramMutation,
} from "@/hooks/useDuplicateProgram";
import { useJourneyImages } from "@/hooks/useJourneyImages";
import { ConfirmCloseModal } from "@/components/common";
import {
  emptyLangTranslation,
  type LangTranslation,
} from "@/utils/program-languages";
import { useAvailableLanguages } from "@/hooks/useAvailableLanguages";

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function calcEndDate(
  startDate: string,
  totalContent: number,
  selectedDays: string[],
  excludedDates: string[],
): string | null {
  if (!startDate || totalContent <= 0 || selectedDays.length === 0) return null;
  const excluded = new Set(excludedDates);
  const cur = new Date(`${startDate}T00:00:00`);
  let count = 0;
  for (let i = 0; i < 3650; i++) {
    const ymd = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
    if (selectedDays.includes(DAY_NAMES[cur.getDay()]) && !excluded.has(ymd)) {
      if (++count >= totalContent) return ymd;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return null;
}

function countContentSlots(
  startDate: string,
  endDate: string,
  selectedDays: string[],
  excludedDates: string[],
): number {
  if (!startDate || !endDate || startDate > endDate) return 0;
  const excluded = new Set(excludedDates);
  const cur = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  let count = 0;
  while (cur <= end) {
    const ymd = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
    if (selectedDays.includes(DAY_NAMES[cur.getDay()]) && !excluded.has(ymd)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

// ── Default empty form ────────────────────────────────────────────────────────

const EMPTY_FORM = {
  programTitle: "",
  companyLogo: null as File | null,
  programDescription: "",
  companyName: "",
  facilitatorName: "",
  visibility: "private" as "public" | "private" | "none",
  programTrack: "" as "" | "individual" | "cohort-scoreboard" | "cohort-leaderboard",
  programType: "scheduled" as "" | "scheduled" | "modular" | "journey",
  journeyImageKey: null as string | null,
  startDate: "",  // overridden at mount with today's date
  endDate: "",
  timeZone: getUserTimeZone(),
  notifications: [
    {
      time: { hours: "08", minutes: "00", ampm: "AM" },
      content: "You have content and actions for today in your course.",
    },
  ],
  performanceIndicator1: "Learning Engagement",
  performanceIndicator2: "Learning Effectiveness",
  meetingLink: "",
  leaderboardEnabled: true,
};

export function DuplicateProgramForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceProgramId = searchParams.get("programId") ?? "";
  const { showToast } = useToast();
  const { availableLanguages: AVAILABLE_LANGUAGES } = useAvailableLanguages();
  const { current_active_plan_type, licenseEndDateStr } = useClientAdmin();
  const isRetail = current_active_plan_type === "retail";

  // ── React Query ───────────────────────────────────────────────────────────

  const {
    data: prefilled,
    isLoading: sourceLoading,
    isError: sourceError,
  } = useSourceProgram(sourceProgramId);

  const duplicateMutation = useDuplicateProgramMutation();

  // ── Local form state ──────────────────────────────────────────────────────

  const [formData, setFormData] = useState(() => ({ ...EMPTY_FORM, startDate: getTodayString() }));

  const { images: journeyImages, loading: journeyImagesLoading } = useJourneyImages(formData.programType === "journey");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);
  const [totalContent, setTotalContent] = useState(0);
  const [endDateWarning, setEndDateWarning] = useState<string | null>(null);

  // Content schedule
  const [selectedDays, setSelectedDays] = useState<string[]>([
    "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
  ]);
  const [excludedDates, setExcludedDates] = useState<string[]>([]);

  // Copy content
  const [copyContent, setCopyContent] = useState<CopyContentState>(DEFAULT_COPY_CONTENT);

  // Multi-language support
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [languageTranslations, setLanguageTranslations] = useState<Record<string, LangTranslation>>({});
  const [collapsedLanguages, setCollapsedLanguages] = useState<Set<string>>(new Set());
  const [langPendingRemoval, setLangPendingRemoval] = useState<string | null>(null);
  const [savedLanguages, setSavedLanguages] = useState<string[]>([]);

  // Validation
  const [fieldError, setFieldError] = useState<{ selector: string; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Timezone dropdown
  const [timeZoneSearch, setTimeZoneSearch] = useState("");
  const [isTimeZoneOpen, setIsTimeZoneOpen] = useState(false);
  const timeZoneDropdownRef = useRef<HTMLDivElement | null>(null);

  // ── Reset seed state whenever the source program changes ─────────────────
  // Client-side navigation to /programs/duplicate?programId=<other id> re-renders
  // this same component instance rather than remounting it, so without this the
  // form (including the title) stays stuck on whichever program was duplicated first.
  const prevSourceProgramIdRef = useRef(sourceProgramId);
  useEffect(() => {
    if (prevSourceProgramIdRef.current !== sourceProgramId) {
      prevSourceProgramIdRef.current = sourceProgramId;
      setSeeded(false);
      setFormData({ ...EMPTY_FORM, startDate: getTodayString() });
      setLogoPreview(null);
      setTotalContent(0);
      setSelectedDays(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
      setExcludedDates([]);
      setSelectedLanguages([]);
      setLanguageTranslations({});
      setCollapsedLanguages(new Set());
      setSavedLanguages([]);
    }
  }, [sourceProgramId]);

  // ── Seed form once prefilled data arrives ─────────────────────────────────

  useEffect(() => {
    if (prefilled && !seeded) {
      // Exclude startDate/endDate — start date defaults to today, end date auto-calculated
      const {
        existingLogoUrl,
        totalContent: tc,
        startDate: _s,
        endDate: _e,
        contentIncludeDays,
        holidays: prefilledHolidays,
        selectedLanguages: prefilledLangs,
        languageTranslations: prefilledTranslations,
        ...rest
      } = prefilled as any;
      setFormData((prev) => ({ ...prev, ...rest }));
      if (existingLogoUrl) setLogoPreview(existingLogoUrl);
      if (typeof tc === "number" && tc > 0) setTotalContent(tc);
      if (Array.isArray(contentIncludeDays) && contentIncludeDays.length > 0) {
        setSelectedDays(contentIncludeDays.map((n: number) => DAY_NAMES[n]).filter(Boolean));
      }
      if (Array.isArray(prefilledHolidays) && prefilledHolidays.length > 0) {
        setExcludedDates(prefilledHolidays);
      }
      if (Array.isArray(prefilledLangs) && prefilledLangs.length > 0) {
        setSelectedLanguages(prefilledLangs);
        setLanguageTranslations(prefilledTranslations || {});
        setSavedLanguages(prefilledLangs);
      }
      setSeeded(true);
    }
  }, [prefilled, seeded]);

  // Auto-calculate end date whenever start, schedule, or totalContent changes
  useEffect(() => {
    if (!totalContent || !formData.startDate || selectedDays.length === 0) return;
    const calculated = calcEndDate(formData.startDate, totalContent, selectedDays, excludedDates);
    if (!calculated) return;

    if (licenseEndDateStr && calculated > licenseEndDateStr) {
      const slots = countContentSlots(formData.startDate, licenseEndDateStr, selectedDays, excludedDates);
      setFormData((prev) => ({ ...prev, endDate: licenseEndDateStr }));
      setEndDateWarning(
        `Your license ends on ${licenseEndDateStr}, which only fits ${slots} of ${totalContent} content items. Select fewer excluded days or adjust the content schedule.`,
      );
    } else {
      setFormData((prev) => ({ ...prev, endDate: calculated }));
      setEndDateWarning(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.startDate, selectedDays, excludedDates, totalContent, licenseEndDateStr]);

  // Clear validation errors when user edits
  useEffect(() => {
    if (!fieldError) return;
    setFieldError(null);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  // Timezone dropdown outside-click
  useEffect(() => {
    if (!isTimeZoneOpen) return;
    const handle = (e: MouseEvent) => {
      if (timeZoneDropdownRef.current && !timeZoneDropdownRef.current.contains(e.target as Node)) {
        setIsTimeZoneOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [isTimeZoneOpen]);

  // ── Timezone options ──────────────────────────────────────────────────────

  const timeZoneOptions = getAllTimeZones();
  const groupedTimeZones = useMemo(() => {
    const query = timeZoneSearch.trim().toLowerCase();
    const filtered = query
      ? timeZoneOptions.filter((z) => formatTimeZoneLabel(z).toLowerCase().includes(query))
      : timeZoneOptions;
    const grouped = filtered.reduce<Record<string, string[]>>((acc, zone) => {
      const [raw = "Other"] = zone.split("/");
      const continent = raw === "Etc" ? "Other" : raw.replace(/_/g, " ");
      if (!acc[continent]) acc[continent] = [];
      acc[continent].push(zone);
      return acc;
    }, {});
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [timeZoneOptions, timeZoneSearch]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "endDate" && totalContent > 0 && formData.startDate && value) {
      const slots = countContentSlots(formData.startDate, value, selectedDays, excludedDates);
      if (slots < totalContent) {
        setEndDateWarning(
          `This end date only fits ${slots} of ${totalContent} content items. Select a later date or adjust the content schedule.`,
        );
      } else {
        setEndDateWarning(null);
      }
    } else if (name === "endDate") {
      setEndDateWarning(null);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      showToast("Logo format must be JPEG or PNG", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Logo size must be less than or equal to 5MB", "error");
      return;
    }
    setFormData((prev) => ({ ...prev, companyLogo: file }));
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleNotificationTimeChange = (
    index: number,
    field: "hours" | "minutes" | "ampm",
    value: string,
  ) => {
    setFormData((prev) => {
      const next = [...prev.notifications];
      next[index] = { ...next[index], time: { ...next[index].time, [field]: value } };
      return { ...prev, notifications: next };
    });
  };

  const handleNotificationContentChange = (index: number, value: string) => {
    setFormData((prev) => {
      const next = [...prev.notifications];
      next[index] = { ...next[index], content: value };
      return { ...prev, notifications: next };
    });
  };

  const addNotification = () => {
    if (formData.notifications.length < 2) {
      setFormData((prev) => ({
        ...prev,
        notifications: [
          ...prev.notifications,
          { time: { hours: "08", minutes: "00", ampm: "AM" }, content: "You have content and actions for today in your course." },
        ],
      }));
    }
  };

  const removeNotification = (index: number) => {
    setFormData((prev) => {
      const next = [...prev.notifications];
      next.splice(index, 1);
      return { ...prev, notifications: next };
    });
  };

  const handleDayToggle = (day: string) =>
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );

  const handleAddExcludedDate = (date: string) =>
    setExcludedDates((prev) => (prev.includes(date) ? prev : [...prev, date]));

  const handleRemoveExcludedDate = (date: string) =>
    setExcludedDates((prev) => prev.filter((d) => d !== date));

  const handleCopyContentChange = (key: CopyContentKey, value: boolean) =>
    setCopyContent((prev) => ({ ...prev, [key]: value }));

  const removeLanguage = (langId: string) => {
    setSelectedLanguages((prev) => prev.filter((id) => id !== langId));
    setLanguageTranslations((prev) => {
      const next = { ...prev };
      delete next[langId];
      return next;
    });
    setCollapsedLanguages((prev) => {
      const next = new Set(prev);
      next.delete(langId);
      return next;
    });
  };

  const handleLanguageToggle = (langId: string) => {
    if (selectedLanguages.includes(langId)) {
      // Only ask for confirmation when removing a language carried over from
      // the source program — one just added this session can be undone freely.
      if (savedLanguages.includes(langId)) {
        setLangPendingRemoval(langId);
      } else {
        removeLanguage(langId);
      }
      return;
    }
    setSelectedLanguages((prev) => [...prev, langId]);
    if (!languageTranslations[langId]) {
      setLanguageTranslations((t) => ({
        ...t,
        [langId]: emptyLangTranslation(formData.notifications),
      }));
    }
  };

  const confirmRemoveLanguage = () => {
    if (!langPendingRemoval) return;
    removeLanguage(langPendingRemoval);
    setLangPendingRemoval(null);
  };

  const handleCollapseToggle = (langId: string) => {
    setCollapsedLanguages((prev) => {
      const next = new Set(prev);
      if (next.has(langId)) next.delete(langId); else next.add(langId);
      return next;
    });
  };

  const handleLangFieldChange = (langId: string, field: keyof LangTranslation, value: string) => {
    setLanguageTranslations((prev) => ({
      ...prev,
      [langId]: { ...prev[langId], [field]: value },
    }));
  };

  const handleLangLogoChange = (langId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) { showToast("Logo format must be JPEG or PNG", "error"); return; }
    if (file.size > 5 * 1024 * 1024) { showToast("Logo size must be less than or equal to 5MB", "error"); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      setLanguageTranslations((prev) => ({
        ...prev,
        [langId]: { ...prev[langId], programLogo: file, programLogoPreview: reader.result as string },
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleLangNotifContentChange = (langId: string, notifIdx: number, value: string) => {
    setLanguageTranslations((prev) => {
      const t = prev[langId];
      const notifs = [...t.notifications];
      notifs[notifIdx] = { content: value };
      return { ...prev, [langId]: { ...t, notifications: notifs } };
    });
  };

  // ── Validation ────────────────────────────────────────────────────────────

  const scrollToSelector = (selector: string) => {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    (el as any).focus?.();
  };

  const validate = () => {
    const blank = (v: string) => String(v || "").trim().length === 0;
    if (blank(formData.programTitle))
      return { message: "Program Title is required", selector: "#programTitle" };
    if (!formData.companyLogo && !logoPreview)
      return { message: "Logo is required", selector: "#companyLogoWrapper" };
    if (blank(formData.programDescription))
      return { message: "Program Description is required", selector: "#programDescription" };
    if (blank(formData.companyName))
      return { message: "Company Name is required", selector: "#companyName" };
    if (blank(formData.facilitatorName))
      return { message: "Facilitator Name is required", selector: "#facilitatorName" };
    if (!formData.programTrack)
      return { message: "Program Track is required", selector: "#programTrackSection" };
    if (formData.programType === "journey" && !formData.journeyImageKey)
      return { message: "Please select a visual image for the Journey", selector: "#journeyImageSection" };
    if (!formData.startDate)
      return { message: "Start Date is required", selector: "#startDate" };
    if (!formData.endDate)
      return { message: "End Date is required", selector: "#endDate" };
    if (formData.startDate < getTodayString())
      return { message: "Start Date cannot be in the past", selector: "#startDate" };
    if (licenseEndDateStr && formData.startDate > licenseEndDateStr)
      return { message: "Start Date must fall within your license period", selector: "#startDate" };
    if (formData.startDate && formData.endDate && formData.endDate < formData.startDate)
      return { message: "End Date must be after Start Date", selector: "#endDate" };
    if (licenseEndDateStr && formData.endDate > licenseEndDateStr)
      return { message: "End Date must fall within your license period", selector: "#endDate" };
    if (totalContent > 0 && formData.startDate && formData.endDate) {
      const slots = countContentSlots(formData.startDate, formData.endDate, selectedDays, excludedDates);
      if (slots < totalContent)
        return {
          message: `End date can only fit ${slots} of ${totalContent} content items. Choose a later date or adjust the content schedule.`,
          selector: "#endDate",
        };
    }
    const notifs = formData.notifications || [];
    if (notifs.length < 1)
      return { message: "At least one notification is required", selector: "#notificationSettings" };
    for (let i = 0; i < notifs.length; i++) {
      if (blank(notifs[i]?.content))
        return { message: "Notification Content is required", selector: `#notificationContent-${i}` };
    }
    if (blank(formData.performanceIndicator1))
      return { message: "Performance Indicator - 1 is required", selector: "#performanceIndicator1" };
    if (blank(formData.performanceIndicator2))
      return { message: "Performance Indicator - 2 is required", selector: "#performanceIndicator2" };
    return null;
  };

  // ── Submit via useMutation ────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError.message);
      setFieldError(validationError);
      scrollToSelector(validationError.selector);
      return;
    }

    duplicateMutation.mutate(
      {
        sourceProgramId,
        formData: { ...formData, selectedLanguages, languageTranslations },
        copyContent,
        selectedDays,
        excludedDates,
      },
      {
        onSuccess: (res) => {
          if (res.success) {
            showToast("Program duplicated successfully", "success");
            router.push("/programs");
          } else {
            const serverError = res.error || "Failed to duplicate program. Please try again.";
            setError(serverError);
            const lower = serverError.toLowerCase();
            if (lower.includes("logo")) scrollToSelector("#companyLogoWrapper");
            else if (lower.includes("notification_content")) scrollToSelector("#notificationContent-0");
            else if (lower.includes("title")) scrollToSelector("#programTitle");
          }
        },
        onError: () => {
          setError("An unexpected error occurred. Please try again.");
        },
      },
    );
  };

  const handleCancel = () => router.push("/programs");

  // ── Render guards ─────────────────────────────────────────────────────────

  if (sourceLoading) return <DuplicateProgramSkeleton />;

  if (sourceError) {
    return (
      <div className={styles.pageWrapper}>
        <h1 className={styles.pageTitle}>Duplicate Program</h1>
        <div className={styles.errorBanner} role="alert">
          Failed to load program data. Please go back and try again.
        </div>
      </div>
    );
  }

  const isSaving = duplicateMutation.isPending;

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div className={styles.pageWrapper}>
      <h1 className={styles.pageTitle}>Duplicate Program</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        {error && !fieldError && (
          <div className={styles.errorBanner} role="alert">{error}</div>
        )}

        {/* ── Add Program Details ───────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Add Program Details</h2>
          <div className={styles.row}>
            <div className={styles.leftColumn}>
              <div className={styles.formGroup}>
                <label htmlFor="programTitle" className={styles.label}>Program Title</label>
                <input
                  type="text"
                  id="programTitle"
                  name="programTitle"
                  value={formData.programTitle}
                  onChange={handleChange}
                  className={`${styles.input} ${fieldError?.selector === "#programTitle" ? styles.inputError : ""}`}
                  placeholder="Enter program title here"
                />
                {fieldError?.selector === "#programTitle" && (
                  <div className={styles.errorText}>{fieldError.message}</div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="programDescription" className={styles.label}>Program Description</label>
                <textarea
                  id="programDescription"
                  name="programDescription"
                  value={formData.programDescription}
                  onChange={handleChange}
                  className={`${styles.textarea} ${fieldError?.selector === "#programDescription" ? styles.inputError : ""}`}
                  placeholder="Enter program description here"
                  rows={5}
                />
                {fieldError?.selector === "#programDescription" && (
                  <div className={styles.errorText}>{fieldError.message}</div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="companyName" className={styles.label}>Company Name</label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  className={`${styles.input} ${fieldError?.selector === "#companyName" ? styles.inputError : ""}`}
                  placeholder="Enter company name here"
                />
                {fieldError?.selector === "#companyName" && (
                  <div className={styles.errorText}>{fieldError.message}</div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="facilitatorName" className={styles.label}>Facilitator Name</label>
                <input
                  type="text"
                  id="facilitatorName"
                  name="facilitatorName"
                  value={formData.facilitatorName}
                  onChange={handleChange}
                  className={`${styles.input} ${fieldError?.selector === "#facilitatorName" ? styles.inputError : ""}`}
                  placeholder="Enter facilitator name here"
                />
                {fieldError?.selector === "#facilitatorName" && (
                  <div className={styles.errorText}>{fieldError.message}</div>
                )}
              </div>
            </div>

            <div className={styles.rightColumn}>
              <div className={styles.formGroup}>
                <label htmlFor="companyLogo" className={styles.label}>Program Logo</label>
                <div
                  id="companyLogoWrapper"
                  className={`${styles.logoUploadArea} ${fieldError?.selector === "#companyLogoWrapper" ? styles.inputError : ""}`}
                >
                  <div className={styles.logoUploadBox}>
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo preview" className={styles.logoPreview} />
                    ) : (
                      <div className={styles.logoPlaceholder}>
                        <span className={styles.logoPlaceholderText}>Logo</span>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    id="companyLogo"
                    name="companyLogo"
                    onChange={handleLogoChange}
                    accept="image/png,image/jpeg"
                    className={styles.fileInput}
                  />
                  <button
                    type="button"
                    className={styles.changeLogoButton}
                    onClick={() => document.getElementById("companyLogo")?.click()}
                  >
                    Change Logo
                  </button>
                </div>
                <p className={styles.logoHint}>
                  Recommended resolution of logo is 150 x 150 pixels File size can be upto
                  5 Mb File type can be PNG or JPEG
                </p>
                {fieldError?.selector === "#companyLogoWrapper" && (
                  <div className={styles.errorText}>{fieldError.message}</div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Set Visibility ────────────────────────────────── */}
        {!isRetail && <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Set Visibility for the Program</h2>
          <div className={styles.visibilityCards}>
            <label className={`${styles.visibilityCard} ${formData.visibility === "public" ? styles.visibilityCardSelected : ""}`}>
              <input type="radio" name="visibility" value="public" checked={formData.visibility === "public"}
                onChange={(e) => setFormData((p) => ({ ...p, visibility: e.target.value as any }))} className={styles.radioInput} />
              <div className={styles.visibilityCardContent}>
                <div className={styles.visibilityIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#EE4723" strokeWidth="2" />
                    <path d="M2 12H22" stroke="#EE4723" strokeWidth="2" />
                    <path d="M12 2C14.5 5 16 8.5 16 12C16 15.5 14.5 19 12 22C9.5 19 8 15.5 8 12C8 8.5 9.5 5 12 2Z" stroke="#EE4723" strokeWidth="2" />
                  </svg>
                </div>
                <h3 className={styles.visibilityCardTitle}>Public - Visible to All</h3>
                <p className={styles.visibilityCardDescription}>
                  Make this program visible to all participants under your account. Anyone with an active license in this organization will be able to view and access the program directly
                </p>
              </div>
              {formData.visibility === "public" && (
                <div className={styles.radioIndicator}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.3333 4L6 11.3333L2.66667 8" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              )}
            </label>

            <label className={`${styles.visibilityCard} ${formData.visibility === "private" ? styles.visibilityCardSelected : ""}`}>
              <input type="radio" name="visibility" value="private" checked={formData.visibility === "private"}
                onChange={(e) => setFormData((p) => ({ ...p, visibility: e.target.value as any }))} className={styles.radioInput} />
              <div className={styles.visibilityCardContent}>
                <div className={styles.visibilityIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="#EE4723" strokeWidth="2" />
                    <path d="M7 11V7C7 4.2 9.2 2 12 2C14.8 2 17 4.2 17 7V11" stroke="#EE4723" strokeWidth="2" />
                  </svg>
                </div>
                <h3 className={styles.visibilityCardTitle}>Private - Access by Code</h3>
                <p className={styles.visibilityCardDescription}>
                  Restrict access to selected participants only. A private program can be accessed only through an access code shared by the trainer/admin. Ideal for exclusive, invite-only, or client-specific programs
                </p>
              </div>
              {formData.visibility === "private" && (
                <div className={styles.radioIndicator}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.3333 4L6 11.3333L2.66667 8" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              )}
            </label>
          </div>
        </section>}

        {/* ── Select Program Track ──────────────────────────── */}
        <section id="programTrackSection" className={styles.section}>
          <h2 className={styles.sectionTitle}>Select Program Track</h2>
          <div className={styles.trackCards}>
            {[
              {
                value: "individual", title: "Individual Mode",
                desc: "A private learning track where participants learn individually, see only their own progress, and chat directly with the facilitator",
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="#EE4723" strokeWidth="2.6" /><path d="M4 20C4 16.6863 7.58172 14 12 14C16.4183 14 20 16.6863 20 20" stroke="#EE4723" strokeWidth="2.6" strokeLinecap="round" /></svg>,
              },
              {
                value: "cohort-scoreboard", title: "Cohort Mode - Scoreboard",
                desc: "A cohort-based program where participants can see their own progress but not compete. Chat is enabled across Cohort, Team, and Facilitator",
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="8" cy="6" r="3" stroke="#EE4723" strokeWidth="2" /><circle cx="16" cy="6" r="3" stroke="#EE4723" strokeWidth="2" /><path d="M2 18C2 15.2386 4.68629 13 8 13C9.5 13 10.875 13.4375 12 14.1875" stroke="#EE4723" strokeWidth="2" strokeLinecap="round" /><path d="M22 18C22 15.2386 19.3137 13 16 13C14.5 13 13.125 13.4375 12 14.1875" stroke="#EE4723" strokeWidth="2" strokeLinecap="round" /><path d="M12 14V20" stroke="#EE4723" strokeWidth="2" strokeLinecap="round" /></svg>,
              },
              {
                value: "cohort-leaderboard", title: "Cohort Mode - Leaderboard",
                desc: "A cohort-based program with full visibility of rankings and performance, fostering healthy competition across the group",
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="12" width="5" height="8" rx="1" stroke="#EE4723" strokeWidth="2" /><rect x="9.5" y="8" width="5" height="12" rx="1" stroke="#EE4723" strokeWidth="2" /><rect x="16" y="10" width="5" height="10" rx="1" stroke="#EE4723" strokeWidth="2" /><path d="M12 4L13 6H11L12 4Z" fill="#EE4723" /></svg>,
              },
            ].map(({ value, title, desc, icon }) => (
              <label key={value} className={`${styles.trackCard} ${formData.programTrack === value ? styles.trackCardSelected : ""}`}>
                <input type="radio" name="programTrack" value={value} checked={formData.programTrack === value}
                  onChange={(e) => setFormData((p) => ({ ...p, programTrack: e.target.value as any }))} className={styles.radioInput} />
                <div className={styles.trackIcon}>{icon}</div>
                <h3 className={styles.trackCardTitle}>{title}</h3>
                <p className={styles.trackCardDescription}>{desc}</p>
                {formData.programTrack === value && (
                  <div className={styles.trackIndicator}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.3333 4L6 11.3333L2.66667 8" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                )}
              </label>
            ))}
          </div>
          {fieldError?.selector === "#programTrackSection" && (
            <div className={styles.errorText} style={{ marginTop: 10 }}>{fieldError.message}</div>
          )}
        </section>

        {/* ── Choose Program Type ───────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 className={styles.sectionTitle}>Choose Program Type</h2>
              <svg width="15" height="20" viewBox="0 0 15 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.49997 0C6.41499 0 5.37445 0.431005 4.60726 1.1982C3.84006 1.96539 3.40906 3.00593 3.40906 4.09091V6.13636C3.40906 7.22134 3.84006 8.26188 4.60726 9.02907C5.37445 9.79627 6.41499 10.2273 7.49997 10.2273C8.58494 10.2273 9.62548 9.79627 10.3927 9.02907C11.1599 8.26188 11.5909 7.22134 11.5909 6.13636V4.09091C11.5909 3.00593 11.1599 1.96539 10.3927 1.1982C9.62548 0.431005 8.58494 0 7.49997 0ZM7.49997 1.70455C8.13287 1.70455 8.73985 1.95597 9.18738 2.4035C9.63491 2.85103 9.88633 3.45801 9.88633 4.09091V6.13636C9.88633 6.76927 9.63491 7.37625 9.18738 7.82378C8.73985 8.27131 8.13287 8.52273 7.49997 8.52273C6.86706 8.52273 6.26008 8.27131 5.81255 7.82378C5.36502 7.37625 5.1136 6.76927 5.1136 6.13636V4.09091C5.1136 3.45801 5.36502 2.85103 5.81255 2.4035C6.26008 1.95597 6.86706 1.70455 7.49997 1.70455Z" fill="#EE4621"/>
                <path d="M0 8.18217C0 7.63969 0.215503 7.11942 0.5991 6.73582C0.982697 6.35222 1.50297 6.13672 2.04545 6.13672H12.9545C13.497 6.13672 14.0173 6.35222 14.4009 6.73582C14.7845 7.11942 15 7.63969 15 8.18217V17.0458C15 17.5883 14.7845 18.1086 14.4009 18.4922C14.0173 18.8758 13.497 19.0913 12.9545 19.0913H2.04545C1.50297 19.0913 0.982697 18.8758 0.5991 18.4922C0.215503 18.1086 0 17.5883 0 17.0458V8.18217Z" fill="#EE4621"/>
                <path d="M8.52268 12.6112C8.80889 12.3965 9.0203 12.0972 9.12697 11.7558C9.23364 11.4143 9.23016 11.0479 9.11703 10.7085C9.0039 10.3691 8.78685 10.0739 8.49662 9.86472C8.20639 9.65553 7.85771 9.54297 7.49996 9.54297C7.1422 9.54297 6.79352 9.65553 6.50329 9.86472C6.21306 10.0739 5.99601 10.3691 5.88288 10.7085C5.76975 11.0479 5.76627 11.4143 5.87294 11.7558C5.97961 12.0972 6.19102 12.3965 6.47723 12.6112V14.9975C6.47723 15.2688 6.58498 15.5289 6.77678 15.7207C6.96858 15.9125 7.22871 16.0202 7.49996 16.0202C7.7712 16.0202 8.03133 15.9125 8.22313 15.7207C8.41493 15.5289 8.52268 15.2688 8.52268 14.9975V12.6112Z" fill="white"/>
              </svg>
            </div>
            <a href="#" className={styles.learnMoreLink}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={styles.infoIcon}>
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="#EE4723" />
              </svg>
              Learn about the program types
            </a>
          </div>
          <div className={styles.typeCards} style={{ pointerEvents: 'none', opacity: 0.6 }}>
            {[
              {
                value: "scheduled", title: "Scheduled Learning",
                desc: "Deliver content on specific dates and times — limited to one per day — with optional access control based on completion of previous content (Calendar View)",
                icon: <svg width="59" height="59" viewBox="0 0 59 59" fill="none"><rect x="3" y="3" width="53" height="53" rx="4" stroke="#CDD8F7" strokeWidth="2" /><rect x="3" y="3" width="53" height="12" rx="4" fill="#5885E6" /><rect x="10" y="22" width="8" height="8" rx="1" fill="#5885E6" /><rect x="25" y="22" width="8" height="8" rx="1" fill="#5885E6" /><rect x="40" y="22" width="8" height="8" rx="1" fill="#5885E6" /><rect x="10" y="37" width="8" height="8" rx="1" fill="#5885E6" /><rect x="25" y="37" width="8" height="8" rx="1" fill="#5885E6" /><rect x="40" y="37" width="8" height="8" rx="1" fill="#9CB8F5" /><rect x="10" y="6" width="4" height="8" rx="2" fill="#9CB8F5" /><rect x="45" y="6" width="4" height="8" rx="2" fill="#9CB8F5" /></svg>,
              },
              {
                value: "modular", title: "Modular Learning",
                desc: "Release multiple contents within the same day, each scheduled by time, with the option to link access to the previous content's completion (List View)",
                icon: <svg width="55" height="55" viewBox="0 0 55 55" fill="none"><rect x="3" y="3" width="49" height="49" rx="4" stroke="#007F54" strokeWidth="2" /><rect x="8" y="8" width="16" height="16" rx="2" fill="#BFF0DE" /><rect x="31" y="8" width="16" height="16" rx="2" fill="#BFF0DE" /><rect x="8" y="31" width="16" height="16" rx="2" fill="#4FBD9D" /><rect x="31" y="31" width="16" height="16" rx="2" fill="#4FBD9D" /></svg>,
              },
              {
                value: "journey", title: "Journey based Learning",
                desc: "Create a milestone-based visual learning path, where each step unlocks sequentially. Ideal for short programs with up to 10 contents (Visual Journey View)",
                icon: <svg width="55" height="55" viewBox="0 0 55 55" fill="none"><circle cx="10" cy="45" r="6" fill="#FDCC00" /><circle cx="45" cy="10" r="6" fill="#FD2F50" /><path d="M10 39V25C10 22 12 20 15 20H40C43 20 45 18 45 15V16" stroke="#241F1F" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" /><circle cx="10" cy="45" r="3" fill="#262120" /><circle cx="45" cy="10" r="3" fill="#261F21" /></svg>,
              },
            ].map(({ value, title, desc, icon }) => (
              <label key={value} className={`${styles.typeCard} ${formData.programType === value ? styles.typeCardSelected : ""}`}>
                <input type="radio" name="programType" value={value} checked={formData.programType === value}
                  onChange={(e) => setFormData((p) => ({ ...p, programType: e.target.value as any }))} className={styles.radioInput} disabled />
                <div className={styles.typeIcon}>{icon}</div>
                <h3 className={styles.typeCardTitle}>{title}</h3>
                <p className={styles.typeCardDescription}>{desc}</p>
                {formData.programType === value && (
                  <div className={styles.typeIndicator}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.3333 4L6 11.3333L2.66667 8" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                )}
              </label>
            ))}
          </div>
        </section>

        {/* Journey image (conditional) */}
        {formData.programType === "journey" && (
          <section id="journeyImageSection" className={styles.section}>
            <h2 className={styles.sectionTitle}>Select the Visual Image for the Journey</h2>
            <p className={styles.journeyImageHint}>The selected image will be used to map and display the journey within the app</p>
            <div className={styles.journeyImageCards}>
              {journeyImagesLoading
                ? [1, 2, 3].map((n) => (
                    <div key={n} className={`${styles.journeyImageCard} animate-pulse`}>
                      <div className={styles.journeyImagePlaceholder} />
                    </div>
                  ))
                : journeyImages.map((img) => (
                    <label key={img.id} className={`${styles.journeyImageCard} ${formData.journeyImageKey === String(img.id) ? styles.journeyImageCardSelected : ""}`}>
                      <input type="radio" name="journeyImage" value={img.id} checked={formData.journeyImageKey === String(img.id)}
                        onChange={() => setFormData((p) => ({ ...p, journeyImageKey: String(img.id) }))} className={styles.radioInput} />
                      {img.image_path
                        ? <img src={img.image_path} alt={img.template_name} className={styles.journeyImageImg} />
                        : <div className={styles.journeyImagePlaceholder} />
                      }
                      {formData.journeyImageKey === String(img.id) && (
                        <div className={styles.journeyImageIndicator}>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.3333 4L6 11.3333L2.66667 8" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                      )}
                    </label>
                  ))
              }
            </div>
            {fieldError?.selector === "#journeyImageSection" && (
              <div className={styles.errorText}>{fieldError.message}</div>
            )}
          </section>
        )}

        {/* ── Content Schedule ─────────────────────────────── */}
        <ContentScheduleSection
          selectedDays={selectedDays}
          excludedDates={excludedDates}
          onDayToggle={handleDayToggle}
          onAddExcludedDate={handleAddExcludedDate}
          onRemoveExcludedDate={handleRemoveExcludedDate}
        />

        {/* ── Program Schedule ──────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Program Schedule</h2>
          <div className={styles.scheduleRow}>
            {/* Start Date */}
            <div className={styles.scheduleGroup}>
              <label htmlFor="startDate" className={styles.label}>Start Date</label>
              <p className={styles.hint}>Users will be allowed to join the program from this date onwards</p>
              <div className={styles.dateInputWrapper}>
                <input type="date" id="startDate" name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  min={getTodayString()}
                  max={licenseEndDateStr || undefined}
                  className={`${styles.input} ${fieldError?.selector === "#startDate" ? styles.inputError : ""}`}
                  onClick={(e) => e.currentTarget.showPicker()} />
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className={styles.dateIcon}>
                  <rect x="5" y="8" width="30" height="27" rx="3" stroke="#EE4621" strokeWidth="2" />
                  <path d="M5 15H35" stroke="#EE4621" strokeWidth="2" />
                  <rect x="12" y="5" width="2" height="6" rx="1" fill="#F49079" />
                  <rect x="26" y="5" width="2" height="6" rx="1" fill="#F49079" />
                  <rect x="10" y="20" width="4" height="4" rx="1" fill="#EE4621" />
                  <rect x="18" y="20" width="4" height="4" rx="1" fill="#EE4621" />
                  <rect x="26" y="20" width="4" height="4" rx="1" fill="#EE4621" />
                  <rect x="10" y="28" width="4" height="4" rx="1" fill="#EE4621" />
                  <rect x="18" y="28" width="4" height="4" rx="1" fill="#EE4621" />
                </svg>
              </div>
              {fieldError?.selector === "#startDate" && (
                <div className={styles.errorText}>{fieldError.message}</div>
              )}
            </div>

            {/* End Date — auto-calculated; shows warning if manually set too early */}
            <div className={styles.scheduleGroup}>
              <label htmlFor="endDate" className={styles.label}>End Date</label>
              <p className={styles.hint}>
                Auto-calculated from the content schedule.
                {totalContent > 0 && ` (${totalContent} content item${totalContent !== 1 ? "s" : ""})`}
                {" "}The end date must fall within your license period, starting from your chosen start date.
              </p>
              <div className={styles.dateInputWrapper}>
                <input type="date" id="endDate" name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  min={formData.startDate || getTodayString()}
                  max={licenseEndDateStr || undefined}
                  className={`${styles.input} ${(fieldError?.selector === "#endDate" || endDateWarning) ? styles.inputError : ""}`}
                  onClick={(e) => e.currentTarget.showPicker()} />
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className={styles.dateIcon}>
                  <rect x="5" y="8" width="30" height="27" rx="3" stroke="#EE4621" strokeWidth="2" />
                  <path d="M5 15H35" stroke="#EE4621" strokeWidth="2" />
                  <rect x="12" y="5" width="2" height="6" rx="1" fill="#F49079" />
                  <rect x="26" y="5" width="2" height="6" rx="1" fill="#F49079" />
                  <rect x="10" y="20" width="4" height="4" rx="1" fill="#EE4621" />
                  <rect x="18" y="20" width="4" height="4" rx="1" fill="#EE4621" />
                  <rect x="26" y="20" width="4" height="4" rx="1" fill="#EE4621" />
                  <rect x="10" y="28" width="4" height="4" rx="1" fill="#EE4621" />
                  <rect x="18" y="28" width="4" height="4" rx="1" fill="#EE4621" />
                </svg>
              </div>
              {(endDateWarning ?? (fieldError?.selector === "#endDate" ? fieldError.message : null)) && (
                <div className={styles.errorText} style={{ lineHeight: "1.4" }}>
                  {endDateWarning ?? fieldError?.message}
                </div>
              )}
            </div>
          </div>

          <div className={styles.formGroup} style={{ marginTop: 20 }}>
            <label htmlFor="programTimeZone" className={styles.label}>Program Timezone</label>
            <p className={styles.hint}>Sets the base timezone for the entire program. All content and notifications will be delivered in this timezone, regardless of participants&apos; locations</p>
            <div ref={timeZoneDropdownRef} className={`${styles.timeSelect} ${styles.timeSelectWide}`}>
              <button id="programTimeZone" type="button" className={styles.customDropdownTrigger}
                onClick={() => setIsTimeZoneOpen((p) => !p)} aria-haspopup="listbox" aria-expanded={isTimeZoneOpen}>
                <span>{formatTimeZoneLabel(formData.timeZone)}</span>
                <svg width="13" height="8" viewBox="0 0 13 8" fill="none" className={`${styles.dropdownIcon} ${isTimeZoneOpen ? styles.dropdownIconOpen : ""}`}>
                  <path d="M1 1L6.5 6L12 1" stroke="#EE4621" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              {isTimeZoneOpen && (
                <div className={styles.customDropdownPanel}>
                  <input type="text" value={timeZoneSearch} onChange={(e) => setTimeZoneSearch(e.target.value)}
                    placeholder="Search timezone or GMT" className={styles.customDropdownSearch} />
                  <div className={styles.customDropdownList} role="listbox">
                    {groupedTimeZones.map(([continent, zones]) => (
                      <div key={continent} className={styles.timeZoneGroup}>
                        <div className={styles.timeZoneGroupTitle}>{continent}</div>
                        {zones.map((tz) => (
                          <button key={tz} type="button"
                            className={`${styles.timeZoneOption} ${formData.timeZone === tz ? styles.timeZoneOptionActive : ""}`}
                            onClick={() => { setFormData((p) => ({ ...p, timeZone: tz })); setIsTimeZoneOpen(false); }}>
                            {formatTimeZoneLabel(tz)}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Copy Other Program Content ────────────────────── */}
        <CopyProgramContentSection copyContent={copyContent} onChange={handleCopyContentChange} />

        {/* ── Notification Settings ─────────────────────────── */}
        <section id="notificationSettings" className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Notification Settings</h2>
            {formData.notifications.length < 2 && (
              <button type="button" className={styles.addNotificationButton} onClick={addNotification}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3V13M3 8H13" stroke="#EE4723" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Add Another Notification
              </button>
            )}
          </div>
          {fieldError?.selector === "#notificationSettings" && (
            <div className={styles.errorText}>{fieldError.message}</div>
          )}

          {formData.notifications.map((notification, index) => (
            <div key={index} className={styles.notificationItem}>
              {formData.notifications.length > 1 && (
                <button type="button" className={styles.notificationCloseButton} onClick={() => removeNotification(index)} aria-label="Remove notification">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M13 1L1 13M1 1L13 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
              <div className={styles.notificationRow}>
                <div className={styles.notificationGroup}>
                  <label className={styles.label}>Content Notification Timing</label>
                  <p className={styles.hint}>Set the time to send automatic reminders to all users in this program, prompting them to access the day&apos;s content</p>
                  <div className={styles.timePicker}>
                    {(["hours", "minutes", "ampm"] as const).map((field) => (
                      <div key={field} className={styles.timeSelect}>
                        <select value={notification.time[field]}
                          onChange={(e) => handleNotificationTimeChange(index, field, e.target.value)}
                          className={styles.ampmSelect}>
                          {field === "hours" && Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0")).map((v) => <option key={v} value={v}>{v}</option>)}
                          {field === "minutes" && ["00", "15", "30", "45"].map((v) => <option key={v} value={v}>{v}</option>)}
                          {field === "ampm" && ["AM", "PM"].map((v) => <option key={v} value={v}>{v}</option>)}
                        </select>
                        <svg width="13" height="8" viewBox="0 0 13 8" fill="none" className={styles.dropdownIcon}>
                          <path d="M1 1L6.5 6L12 1" stroke="#EE4621" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.notificationGroup}>
                  <label className={styles.label}>Notification Content</label>
                  <p className={styles.hint}>Configure the content for push notification that gets sent at the time set</p>
                  <textarea
                    id={`notificationContent-${index}`}
                    name={`notificationContent-${index}`}
                    value={notification.content}
                    onChange={(e) => handleNotificationContentChange(index, e.target.value)}
                    className={`${styles.notificationTextarea} ${fieldError?.selector === `#notificationContent-${index}` ? styles.inputError : ""}`}
                    placeholder="You have content and actions for today in your course."
                    rows={3}
                  />
                  {fieldError?.selector === `#notificationContent-${index}` && (
                    <div className={styles.errorText}>{fieldError.message}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* ── Other Configurations ──────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Other Configurations</h2>
            <a href="#" className={styles.learnMoreLink}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={styles.infoIcon}>
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="#EE4723" />
              </svg>
              Learn how the indicators are measured
            </a>
          </div>
          <p className={styles.configHint}>You can customize the performance indicator titles shown to users in the app</p>
          <div className={styles.configRow}>
            {[
              { id: "performanceIndicator1", label: "Performance Indicator - 1", placeholder: "Learning Engagement" },
              { id: "performanceIndicator2", label: "Performance Indicator - 2", placeholder: "Learning Effectiveness" },
            ].map(({ id, label, placeholder }) => (
              <div key={id} className={styles.formGroup}>
                <label htmlFor={id} className={styles.label}>{label}</label>
                <input type="text" id={id} name={id}
                  value={formData[id as "performanceIndicator1" | "performanceIndicator2"]}
                  onChange={handleChange}
                  className={`${styles.input} ${fieldError?.selector === `#${id}` ? styles.inputError : ""}`}
                  placeholder={placeholder} />
                {fieldError?.selector === `#${id}` && <div className={styles.errorText}>{fieldError.message}</div>}
              </div>
            ))}
          </div>
          <div className={styles.divider} />
          <div className={styles.configRow}>
            <div className={styles.formGroup}>
              <label htmlFor="meetingLink" className={styles.label}>
                Meeting Link <span style={{ fontWeight: 400, color: "rgba(30,30,30,0.45)" }}>(Optional)</span>
              </label>
              <p className={styles.hint}>You can add a meeting link here, which can later be shared with users as part of the daily content or whenever needed</p>
              <input type="text" id="meetingLink" name="meetingLink" value={formData.meetingLink}
                onChange={handleChange} className={styles.input} placeholder="Add meeting link here" />
            </div>
          </div>
        </section>

        {/* ── Multi-Language Support ────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Multi-Language Support</h2>
          <p className={styles.langDescription}>
            Select languages to add translated program details. Each selected language will generate a localisation section below.
          </p>
          <div className={styles.langChipsRow}>
            {AVAILABLE_LANGUAGES.map((lang) => {
              const isSelected = selectedLanguages.includes(lang.id);
              return (
                <button
                  key={lang.id}
                  type="button"
                  className={`${styles.langChip} ${isSelected ? styles.langChipSelected : ""}`}
                  onClick={() => handleLanguageToggle(lang.id)}
                >
                  <span className={styles.langChipCheckbox}>
                    {isSelected && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className={styles.langChipTextGroup}>
                    <span className={styles.langChipName}>{lang.name}</span>
                    <span className={styles.langChipNative}>{lang.nativeName}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Per-Language Translation Sections ─────────────── */}
        {selectedLanguages.map((langId) => {
          const lang = AVAILABLE_LANGUAGES.find((l) => l.id === langId);
          const translation = languageTranslations[langId];
          if (!lang || !translation) return null;
          return (
            <section key={langId} className={styles.section}>
              <div
                className={styles.langBlockHeader}
                style={{ marginBottom: collapsedLanguages.has(langId) ? 0 : undefined }}
                onClick={() => handleCollapseToggle(langId)}
              >
                <div className={styles.langBlockTitleGroup}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" stroke="var(--color-primary)" strokeWidth="1.8" />
                    <path d="M2 12H22" stroke="var(--color-primary)" strokeWidth="1.8" />
                    <path d="M12 2C14.5 5 16 8.5 16 12C16 15.5 14.5 19 12 22C9.5 19 8 15.5 8 12C8 8.5 9.5 5 12 2Z" stroke="var(--color-primary)" strokeWidth="1.8" />
                  </svg>
                  <h2 className={styles.sectionTitle} style={{ margin: 0 }}>{lang.name}</h2>
                  <span className={styles.langNativeTag}>{lang.nativeName}</span>
                </div>
                <button
                  type="button"
                  className={styles.langCollapseButton}
                  onClick={(e) => { e.stopPropagation(); handleCollapseToggle(langId); }}
                  aria-label={collapsedLanguages.has(langId) ? `Expand ${lang.name}` : `Collapse ${lang.name}`}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={collapsedLanguages.has(langId) ? styles.langChevronCollapsed : styles.langChevronExpanded}>
                    <path d="M2 5L7 10L12 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              {!collapsedLanguages.has(langId) && (
                <>
                  <div className={styles.langSubSection}>
                    <h3 className={styles.langSubTitle}>Add Program Details</h3>
                    <div className={styles.row}>
                      <div className={styles.leftColumn}>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Title</label>
                          <input type="text" value={translation.title} onChange={(e) => handleLangFieldChange(langId, "title", e.target.value)} className={styles.input} placeholder={`Enter program title in ${lang.name}`} />
                        </div>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Description</label>
                          <textarea value={translation.description} onChange={(e) => handleLangFieldChange(langId, "description", e.target.value)} className={styles.textarea} placeholder={`Enter program description in ${lang.name}`} rows={5} />
                        </div>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Company Name</label>
                          <input type="text" value={translation.companyName} onChange={(e) => handleLangFieldChange(langId, "companyName", e.target.value)} className={styles.input} placeholder={`Enter company name in ${lang.name}`} />
                        </div>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Facilitator Name</label>
                          <input type="text" value={translation.facilitatorName} onChange={(e) => handleLangFieldChange(langId, "facilitatorName", e.target.value)} className={styles.input} placeholder={`Enter facilitator name in ${lang.name}`} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={styles.langSubDivider} />

                  <div className={styles.langSubSection}>
                    <h3 className={styles.langSubTitle}>Notification Setting</h3>
                    {formData.notifications.map((notif, idx) => (
                      <div key={idx} className={styles.notificationItem}>
                        <div className={styles.notificationRow}>
                          <div className={styles.notificationGroup}>
                            <label className={styles.label}>Content Notification Timing</label>
                            <p className={styles.hint}>Timing is configured in the main program settings</p>
                            <div className={styles.langNotifTimingReadonly}>
                              <span>{notif.time.hours}:{notif.time.minutes} {notif.time.ampm}</span>
                            </div>
                          </div>
                          <div className={styles.notificationGroup}>
                            <label className={styles.label}>Notification Content</label>
                            <p className={styles.hint}>Configure the push notification content in {lang.name}</p>
                            <textarea
                              value={translation.notifications[idx]?.content ?? ""}
                              onChange={(e) => handleLangNotifContentChange(langId, idx, e.target.value)}
                              className={styles.notificationTextarea}
                              placeholder={`Enter notification content in ${lang.name}`}
                              rows={3}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className={styles.langSubDivider} />

                  <div className={styles.langSubSection}>
                    <h3 className={styles.langSubTitle}>Other Configurations</h3>
                    <div className={styles.configRow}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Performance Indicator 1</label>
                        <input type="text" value={translation.performanceIndicator1} onChange={(e) => handleLangFieldChange(langId, "performanceIndicator1", e.target.value)} className={styles.input} placeholder={`Enter performance indicator 1 in ${lang.name}`} />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Performance Indicator 2</label>
                        <input type="text" value={translation.performanceIndicator2} onChange={(e) => handleLangFieldChange(langId, "performanceIndicator2", e.target.value)} className={styles.input} placeholder={`Enter performance indicator 2 in ${lang.name}`} />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </section>
          );
        })}

        {/* ── Action Buttons ────────────────────────────────── */}
        <div className={styles.buttonGroup}>
          <button type="button" onClick={handleCancel} className={styles.closeButton}>
            Close
          </button>
          <button type="submit" className={styles.saveButton} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save Program"}
          </button>
        </div>
      </form>

      {langPendingRemoval && (
        <ConfirmCloseModal
          title="Remove Language"
          message={`Are you sure you want to remove ${AVAILABLE_LANGUAGES.find((l) => l.id === langPendingRemoval)?.name ?? "this language"}? Its translated program details will be deleted.`}
          confirmText="Remove"
          onConfirm={confirmRemoveLanguage}
          onCancel={() => setLangPendingRemoval(null)}
        />
      )}
    </div>
  );
}
