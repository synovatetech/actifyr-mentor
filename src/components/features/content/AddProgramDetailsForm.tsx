"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "@/styles/ai-content.module.css";
import { aiService } from "@/services/api/ai.service";
import { toast } from "react-hot-toast";
import type { Program } from "@/types";
import dayjs, { Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useClientStore } from "@/store/clientStore";

dayjs.extend(customParseFormat);

interface FileItem {
  id: string;
  name: string;
}

export interface ProgramDetailsFormDraft {
  selectedDays: string[];
  files: FileItem[];
  developSkills: number;
  createAwareness: number;
  programTitle: string;
  programDuration: string;
  startDate: string;
  programContext: string;
  programObjective: string;
  participantContext: string;
  outputGuidelines: string;
  expectedOutcome: string;
  preWork: string;
  preWorkDays: string;
  tone: string;
  numberOfWords: string;
  contentType: string;
  includeAssessment: string;
  assessmentFrequency: string;
  assessmentType: string;
  proofOfWork: string;
  proofOfAction: string;
  proofOfIntent: string;
  generalEvidence: string;
  includeGroupDiscussion: string;
  groupDiscussionFrequency: string;
}

export function AddProgramDetailsForm({
  onClose,
  onEstimateSuccess,
  programId,
  programDetails,
  draftValues,
  onDraftValuesChange,
}: {
  onClose: () => void;
  onEstimateSuccess: (
    programConfigId: number,
    tokenEstimate: any,
    payload: any,
  ) => void;
  programId: string;
  programDetails?: Program | null;
  draftValues?: ProgramDetailsFormDraft | null;
  onDraftValuesChange?: (values: ProgramDetailsFormDraft) => void;
}) {
  const [selectedDays, setSelectedDays] = useState<string[]>(
    draftValues?.selectedDays || ["Monday"],
  );
  const [files, setFiles] = useState<FileItem[]>(draftValues?.files || []);
  const [developSkills, setDevelopSkills] = useState(
    draftValues?.developSkills ?? 45,
  );
  const [createAwareness, setCreateAwareness] = useState(
    draftValues?.createAwareness ?? 30,
  );

  // Form inputs state
  const [programTitle, setProgramTitle] = useState(draftValues?.programTitle || "");
  const [programDuration, setProgramDuration] = useState(
    draftValues?.programDuration || "",
  );
  const [startDate, setStartDate] = useState(draftValues?.startDate || "");
  const [programContext, setProgramContext] = useState(
    draftValues?.programContext || "",
  );
  const [programObjective, setProgramObjective] = useState(
    draftValues?.programObjective || "",
  );
  const [participantContext, setParticipantContext] = useState(
    draftValues?.participantContext || "",
  );
  const [outputGuidelines, setOutputGuidelines] = useState(
    draftValues?.outputGuidelines || "",
  );
  const [expectedOutcome, setExpectedOutcome] = useState(
    draftValues?.expectedOutcome || "",
  );
  const [preWork, setPreWork] = useState(draftValues?.preWork || "");
  const [preWorkDays, setPreWorkDays] = useState(draftValues?.preWorkDays || "");
  const [tone, setTone] = useState(draftValues?.tone || "");
  const [numberOfWords, setNumberOfWords] = useState(
    draftValues?.numberOfWords || "",
  );

  // Additional Form Elements
  const [contentType, setContentType] = useState(draftValues?.contentType || "");
  const [includeAssessment, setIncludeAssessment] = useState(
    draftValues?.includeAssessment || "",
  );
  const [assessmentFrequency, setAssessmentFrequency] = useState(
    draftValues?.assessmentFrequency || "",
  );
  const [assessmentType, setAssessmentType] = useState(
    draftValues?.assessmentType || "",
  );
  const [proofOfWork, setProofOfWork] = useState(draftValues?.proofOfWork || "");
  const [proofOfAction, setProofOfAction] = useState(
    draftValues?.proofOfAction || "",
  );
  const [proofOfIntent, setProofOfIntent] = useState(
    draftValues?.proofOfIntent || "",
  );
  const [generalEvidence, setGeneralEvidence] = useState(
    draftValues?.generalEvidence || "",
  );
  const [includeGroupDiscussion, setIncludeGroupDiscussion] = useState(
    draftValues?.includeGroupDiscussion || "",
  );
  const [groupDiscussionFrequency, setGroupDiscussionFrequency] = useState(
    draftValues?.groupDiscussionFrequency || "",
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const startDateInputRef = useRef<HTMLInputElement | null>(null);
  const { clientData } = useClientStore();
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayToIndex: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const parseInputDate = (value: string): Dayjs | null => {
    const raw = value?.trim();
    if (!raw) return null;

    const supportedFormats = [
      "DD-MM-YYYY",
      "YYYY-MM-DD",
      "YYYY-MM-DDTHH:mm:ss",
      "YYYY-MM-DDTHH:mm:ss.SSS[Z]",
      "YYYY-MM-DDTHH:mm:ssZ",
    ];

    for (const format of supportedFormats) {
      const parsed = dayjs(raw, format, true);
      if (parsed.isValid()) {
        return parsed.startOf("day");
      }
    }

    const isoFallback = dayjs(raw);
    if (isoFallback.isValid()) {
      return isoFallback.startOf("day");
    }

    return null;
  };

  const formatDDMMYYYY = (date: Dayjs): string => {
    return date.format("DD-MM-YYYY");
  };

  const formatYYYYMMDD = (date: Dayjs): string => {
    return date.format("YYYY-MM-DD");
  };

  const countMatchingDaysInRange = (
    from: Dayjs,
    to: Dayjs,
    allowedDays: Set<number>,
  ): number => {
    if (from.isAfter(to, "day")) return 0;

    let cursor = from.startOf("day");
    const end = to.startOf("day");
    let count = 0;

    while (cursor.isBefore(end, "day") || cursor.isSame(end, "day")) {
      if (allowedDays.has(cursor.day())) {
        count += 1;
      }
      cursor = cursor.add(1, "day");
    }

    return count;
  };

  const dateDiffInDaysInclusive = (from: Dayjs, to: Dayjs): number => {
    return to.startOf("day").diff(from.startOf("day"), "day") + 1;
  };

  useEffect(() => {
    if (!programDetails || startDate) return;

    const detailsStartDate = parseInputDate(
      (programDetails as any).start_date || programDetails.startDate || "",
    );
    const detailsEndDate = parseInputDate(
      (programDetails as any).end_date || programDetails.endDate || "",
    );

    if (detailsStartDate) {
      setStartDate(formatYYYYMMDD(detailsStartDate));
    }
  }, [programDetails, startDate]);

  useEffect(() => {
    if (!onDraftValuesChange) return;

    onDraftValuesChange({
      selectedDays,
      files,
      developSkills,
      createAwareness,
      programTitle,
      programDuration,
      startDate,
      programContext,
      programObjective,
      participantContext,
      outputGuidelines,
      expectedOutcome,
      preWork,
      preWorkDays,
      tone,
      numberOfWords,
      contentType,
      includeAssessment,
      assessmentFrequency,
      assessmentType,
      proofOfWork,
      proofOfAction,
      proofOfIntent,
      generalEvidence,
      includeGroupDiscussion,
      groupDiscussionFrequency,
    });
  }, [
    selectedDays,
    files,
    developSkills,
    createAwareness,
    programTitle,
    programDuration,
    startDate,
    programContext,
    programObjective,
    participantContext,
    outputGuidelines,
    expectedOutcome,
    preWork,
    preWorkDays,
    tone,
    numberOfWords,
    contentType,
    includeAssessment,
    assessmentFrequency,
    assessmentType,
    proofOfWork,
    proofOfAction,
    proofOfIntent,
    generalEvidence,
    includeGroupDiscussion,
    groupDiscussionFrequency,
    onDraftValuesChange,
  ]);

  const minSelectableStartDate = parseInputDate(
    (programDetails as any)?.start_date || programDetails?.startDate || "",
  )?.format("YYYY-MM-DD");

  const maxSelectableStartDate = parseInputDate(
    (programDetails as any)?.end_date || programDetails?.endDate || "",
  )?.format("YYYY-MM-DD");

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const openStartDatePicker = () => {
    const input = startDateInputRef.current as
      | (HTMLInputElement & { showPicker?: () => void })
      | null;
    if (!input?.showPicker) return;
    try {
      input.showPicker();
    } catch {
      // Some browsers throw if showPicker is called without a valid user gesture.
      // Fallback to native input behavior in those cases.
    }
  };

  const handleEstimateTokens = async () => {
    if (!programTitle.trim()) {
      toast.error("Program Title is required");
      return;
    }

    if (!programDuration.trim()) {
      toast.error("Content Days (Duration) is required");
      return;
    }

    if (!startDate.trim()) {
      toast.error("Content Start Date is required");
      return;
    }

    if (!programContext.trim()) {
      toast.error("Program Context is required");
      return;
    }

    if (!programObjective.trim()) {
      toast.error("Program Objectives are required");
      return;
    }

    if (!participantContext.trim()) {
      toast.error("Participant Context is required");
      return;
    }

    if (!outputGuidelines.trim()) {
      toast.error("Output Guidelines are required");
      return;
    }

    if (selectedDays.length === 0) {
      toast.error("Select at least one day in Content Frequency");
      return;
    }

    if (!expectedOutcome.trim()) {
      toast.error("Expected Outcome is required");
      return;
    }

    if (preWork === "Yes" && !preWorkDays.trim()) {
      toast.error("Number of pre-work days is required");
      return;
    }

    if (!tone) {
      toast.error("Tone is required");
      return;
    }

    if (!contentType) {
      toast.error("Content Type is required");
      return;
    }

    if (!numberOfWords.trim()) {
      toast.error("Number of words is required");
      return;
    }

    if (!includeAssessment) {
      toast.error("Include Assessment selection is required");
      return;
    }

    if (includeAssessment === "Yes" && !assessmentFrequency) {
      toast.error("Assessment Frequency is required");
      return;
    }

    if (includeAssessment === "Yes" && !assessmentType) {
      toast.error("Assessment Type is required");
      return;
    }

    if (!proofOfWork) {
      toast.error("Proof of Work (PoW) is required");
      return;
    }

    if (!proofOfAction) {
      toast.error("Proof of Action (PoA) is required");
      return;
    }

    if (!proofOfIntent) {
      toast.error("Proof of Intent (PoI) is required");
      return;
    }

    if (!generalEvidence) {
      toast.error("General evidence frequency is required");
      return;
    }

    if (!includeGroupDiscussion) {
      toast.error("Group discussion selection is required");
      return;
    }

    if (includeGroupDiscussion === "Yes" && !groupDiscussionFrequency) {
      toast.error("Group discussion frequency is required");
      return;
    }

    const parsedStartDate = parseInputDate(startDate);
    if (!parsedStartDate) {
      toast.error("Content Start Date is required");
      return;
    }

    const programStartFromDetails = parseInputDate(
      (programDetails as any)?.start_date || programDetails?.startDate || "",
    );
    const programEndFromDetails = parseInputDate(
      (programDetails as any)?.end_date || programDetails?.endDate || "",
    );

    if (
      programStartFromDetails &&
      parsedStartDate.isBefore(programStartFromDetails, "day")
    ) {
      toast.error("Content Start Date cannot be less than Program Start Date");
      return;
    }

    if (
      programEndFromDetails &&
      parsedStartDate.isAfter(programEndFromDetails, "day")
    ) {
      toast.error("Content Start Date cannot be more than Program End Date");
      return;
    }

    const durationDays = parseInt(programDuration, 10);
    if (!durationDays || durationDays <= 0) {
      toast.error("Program Duration (Days) must be greater than 0");
      return;
    }

    const numberOfWordsCount = parseInt(numberOfWords, 10);
    if (!numberOfWordsCount || numberOfWordsCount <= 0) {
      toast.error("Number of words must be greater than 0");
      return;
    }

    const selectedDayIndexes = new Set(
      selectedDays
        .map((day) => dayToIndex[day.toLowerCase()])
        .filter((value): value is number => typeof value === "number"),
    );

    if (selectedDayIndexes.size === 0) {
      toast.error("Select at least one day in Content Frequency");
      return;
    }

    const includePreWork = preWork === "Yes";
    const preWorkDaysCount = includePreWork
      ? parseInt(preWorkDays, 10) || 0
      : 0;

    if (includePreWork && preWorkDaysCount <= 0) {
      toast.error("Number of pre-work days must be greater than 0");
      return;
    }

    const programEndDate = programEndFromDetails
      ? programEndFromDetails
      : parsedStartDate.add(durationDays - 1, "day");

    if (programEndDate.isBefore(parsedStartDate, "day")) {
      toast.error("Program end date cannot be earlier than start date");
      return;
    }

    const totalProgramWindowDays = dateDiffInDaysInclusive(
      parsedStartDate,
      programEndDate,
    );
    if (durationDays > totalProgramWindowDays) {
      toast.error(
        `Program Duration (${durationDays}) exceeds available days between start and end date (${totalProgramWindowDays}).`,
      );
      return;
    }

    const availableProgramFrequencyDays = countMatchingDaysInRange(
      parsedStartDate,
      programEndDate,
      selectedDayIndexes,
    );

    if (availableProgramFrequencyDays < durationDays) {
      toast.error(
        `Content Frequency has only ${availableProgramFrequencyDays} matching day(s) between ${formatDDMMYYYY(parsedStartDate)} and ${formatDDMMYYYY(programEndDate)}. Increase frequency days or adjust duration.`,
      );
      return;
    }

    if (includePreWork && preWorkDaysCount > 0) {
      const preWorkEndDate = parsedStartDate.subtract(1, "day");
      const preWorkStartDate = parsedStartDate.subtract(
        preWorkDaysCount,
        "day",
      );

      const availablePreWorkFrequencyDays = countMatchingDaysInRange(
        preWorkStartDate,
        preWorkEndDate,
        selectedDayIndexes,
      );

      if (availablePreWorkFrequencyDays < preWorkDaysCount) {
        toast.error(
          `Pre-work needs ${preWorkDaysCount} day(s), but Content Frequency has only ${availablePreWorkFrequencyDays} matching day(s) before start date.`,
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        user_id: clientData?.client_id,
        program_id: programId ? parseInt(programId) : undefined,
        program_duration: durationDays,
        content_start_date: startDate,
        program_end_date: programEndDate.format("YYYY-MM-DD"),
        program_title: programTitle,
        program_context: programContext,
        program_objective: programObjective,
        expected_outcome: expectedOutcome,
        participant_context: participantContext,
        output_guidelines: outputGuidelines,
        content_frequent_days: selectedDays.map((d) => d.toLowerCase()),
        pre_work: includePreWork ? String(preWorkDaysCount) : "",
        skills_percentage: developSkills,
        awareness_percentage: createAwareness,
        tone: tone,
        number_of_words: numberOfWordsCount,
        context_type: contentType,
        include_assessment: includeAssessment === "Yes",
        assessment_frequent: assessmentFrequency,
        assessment_type: assessmentType,
        proof_of_work: proofOfWork,
        proof_of_action: proofOfAction,
        proof_of_intent: proofOfIntent,
        general_evidence: generalEvidence,
        include_group_discussion:
          includeGroupDiscussion === "Yes" ? groupDiscussionFrequency : "",
      };

      const response = await aiService.getEstimate(payload);
      if (response.success && response.data) {
        toast.success("Estimates calculated successfully");
        const configId =
          response.data.program_config_id ||
          response.data?.data?.program_config_id;
        onEstimateSuccess(configId, response.data, payload);
      } else {
        toast.error(response.error || "Failed to estimate tokens");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <h2 className={styles.sectionTitle}>Add Program Details</h2>

      <div className={styles.formGroup}>
        <label className={styles.label}>Program Title</label>
        <input
          type="text"
          className={styles.input}
          placeholder="Enter program title here"
          value={programTitle}
          onChange={(e) => setProgramTitle(e.target.value)}
        />
      </div>

      <div className={styles.row}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Content Days (Duration)</label>
          <input
            type="number"
            className={`${styles.input} ${styles.numberInputNoSpinner}`}
            placeholder="e.g. 30"
            value={programDuration}
            min={0}
            step={1}
            onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
            onKeyDown={(e) => {
              if (e.key === "-" || e.key === "e" || e.key === "E" || e.key === "+") {
                e.preventDefault();
              }
            }}
            onChange={(e) => {
              const nextValue = e.target.value;
              if (nextValue === "") {
                setProgramDuration("");
                return;
              }

              const numericValue = Number(nextValue);
              if (!Number.isNaN(numericValue)) {
                setProgramDuration(String(Math.max(0, Math.floor(numericValue))));
              }
            }}
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Content Start Date</label>
          <div className={styles.dateInputWrapper}>
            <input
              ref={startDateInputRef}
              type="date"
              className={`${styles.input} ${styles.dateInput}`}
              value={startDate}
              min={minSelectableStartDate}
              max={maxSelectableStartDate}
              onChange={(e) => setStartDate(e.target.value)}
              onClick={openStartDatePicker}
            />
            <button
              type="button"
              className={styles.dateIconButton}
              onClick={openStartDatePicker}
              aria-label="Open content start date picker"
            >
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
            </button>
          </div>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Program Context</label>
        <textarea
          className={styles.textarea}
          placeholder="Enter the context of this program"
          value={programContext}
          onChange={(e) => setProgramContext(e.target.value)}
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Program Objectives</label>
        <textarea
          className={styles.textarea}
          placeholder="Enter program objectives"
          value={programObjective}
          onChange={(e) => setProgramObjective(e.target.value)}
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Attach Documents</label>
        <div className={styles.uploadContainer}>
          <div className={styles.uploadLeft}>
            <div className={styles.uploadFileList}>
              {files.length === 0 && (
                <p style={{ fontSize: "14px", color: "#6B7280" }}>
                  No files attached yet.
                </p>
              )}
              {files.map((file) => (
                <div key={file.id} className={styles.uploadFileItem}>
                  <input
                    type="text"
                    className={styles.input}
                    value={file.name}
                    readOnly
                    style={{ width: "calc(100% - 70px)" }}
                  />
                  <button
                    className={styles.removeButton}
                    onClick={() =>
                      setFiles(files.filter((f) => f.id !== file.id))
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className={styles.uploadInputWrapper}>
              <input
                type="text"
                className={styles.input}
                placeholder="Click to browse file"
                readOnly
              />
              <input
                type="file"
                id="fileInput"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setFiles([
                      ...files,
                      {
                        id: Math.random().toString(),
                        name: e.target.files[0].name,
                      },
                    ]);
                  }
                }}
              />
              <button
                className={styles.browseButton}
                onClick={() => document.getElementById("fileInput")?.click()}
              >
                Browse
              </button>
            </div>
            <span
              className={styles.addMore}
              onClick={() => document.getElementById("fileInput")?.click()}
            >
              Add more
            </span>
          </div>
          <div className={styles.uploadRight}>
            <h4>
              Upload supporting documents, such as those listed below, to help
              generate content
            </h4>
            <ul>
              <li>Training Requirements document - TRD</li>
              <li>Training Design Document - TDD</li>
              <li>Facilitator Guide</li>
              <li>Participant Guide</li>
              <li>Training materials</li>
              <li>Other documents</li>
              <li>Video links</li>
              <li>Audio</li>
              <li>Web page links</li>
            </ul>
          </div>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Participant Context</label>
        <textarea
          className={styles.textarea}
          placeholder="Role, Level, Industry, Demographics, etc"
          value={participantContext}
          onChange={(e) => setParticipantContext(e.target.value)}
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Output Guidelines</label>
        <textarea
          className={styles.textarea}
          placeholder="Practical and workplace-relevant. Inclusive, bias-free, and respectful. Written in clear, coach-like language. Based on the stated objectives and audience"
          value={outputGuidelines}
          onChange={(e) => setOutputGuidelines(e.target.value)}
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Content Frequency</label>
        <p style={{ fontSize: "11px", color: "#6B7280", marginBottom: "12px" }}>
          Select the days for which the content will be generated
        </p>
        <div className={styles.daySelector}>
          {days.map((day) => (
            <div
              key={day}
              className={`${styles.dayCard} ${selectedDays.includes(day) ? styles.selected : ""}`}
              onClick={() => toggleDay(day)}
            >
              <span className={styles.dayCardName}>{day}</span>
              <div className={styles.checkboxSmall}>
                {selectedDays.includes(day) && (
                  <svg
                    className={styles.checkMark}
                    width="8"
                    height="6"
                    viewBox="0 0 8 6"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M1 3.5L3 5.5L7 1"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.divider} />

      <h2 className={styles.sectionTitle}>Expected Outcome</h2>

      <div className={styles.formGroup}>
        <label className={styles.label}>Describe the outcome expected</label>
        <textarea
          className={styles.textarea}
          placeholder="The participants must be fully aware about the design thinking process and also be proficient in using design thinking to solve problems"
          value={expectedOutcome}
          onChange={(e) => setExpectedOutcome(e.target.value)}
        />
      </div>

      <div className={styles.row}>
        <div className={styles.sliderGroup}>
          <div className={styles.sliderHeader}>
            <label className={styles.sliderLabel}>Develop Skills</label>
            <span className={styles.sliderValue}>{developSkills}%</span>
          </div>
          <div className={styles.sliderWrapper}>
            <div
              className={styles.sliderFilled}
              style={{ width: `${developSkills}%` }}
            ></div>
            <div
              className={styles.sliderThumb}
              style={{ left: `${developSkills}%` }}
            ></div>
            <input
              type="range"
              className={styles.sliderInput}
              min="0"
              max="100"
              value={developSkills}
              onChange={(e) => setDevelopSkills(parseInt(e.target.value))}
            />
          </div>
        </div>
        <div className={styles.sliderGroup}>
          <div className={styles.sliderHeader}>
            <label className={styles.sliderLabel}>Create Awareness</label>
            <span className={styles.sliderValue}>{createAwareness}%</span>
          </div>
          <div className={styles.sliderWrapper}>
            <div
              className={styles.sliderFilled}
              style={{ width: `${createAwareness}%` }}
            ></div>
            <div
              className={styles.sliderThumb}
              style={{ left: `${createAwareness}%` }}
            ></div>
            <input
              type="range"
              className={styles.sliderInput}
              min="0"
              max="100"
              value={createAwareness}
              onChange={(e) => setCreateAwareness(parseInt(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Pre-Work</label>
          <div className={styles.preWorkRow}>
            <div className={styles.selectWrapper} style={{ flex: 1 }}>
              <select
                className={styles.select}
                value={preWork}
                onChange={(e) => setPreWork(e.target.value)}
              >
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <input
              type="text"
              className={styles.input}
              placeholder="Number of pre-work days"
              style={{ flex: 2 }}
              value={preWorkDays}
              onChange={(e) => setPreWorkDays(e.target.value)}
              disabled={preWork !== "Yes"}
            />
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Tone</label>
          <div className={styles.selectWrapper}>
            <select
              className={styles.select}
              value={tone}
              onChange={(e) => setTone(e.target.value)}
            >
              <option value="">Select</option>
              <option value="Instructor">Instructor</option>
              <option value="Coach">Coach</option>
              <option value="Mentor">Mentor</option>
              <option value="Others">Others</option>
            </select>
          </div>
        </div>
      </div>

      <div className={styles.divider} />

      <h2 className={styles.sectionTitle}>Program Objectives</h2>

      <div className={styles.row}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Content Type</label>
          <div className={styles.selectWrapper}>
            <select
              className={styles.select}
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
            >
              <option value="">Select</option>
              <option value="Text Only">Text Only</option>
              <option value="Text + Video/Audio">Text + Video/Audio</option>
            </select>
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Number of words, if text</label>
          <input
            type="text"
            className={styles.input}
            placeholder="Enter number of words"
            value={numberOfWords}
            onChange={(e) => setNumberOfWords(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Include Assessment</label>
          <div className={styles.selectWrapper}>
            <select
              className={styles.select}
              value={includeAssessment}
              onChange={(e) => setIncludeAssessment(e.target.value)}
            >
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Assessment Frequency</label>
          <div className={styles.selectWrapper}>
            <select
              className={styles.select}
              value={assessmentFrequency}
              onChange={(e) => setAssessmentFrequency(e.target.value)}
            >
              <option value="">Select</option>
              <option value="Everyday">Everyday</option>
              <option value="Alternative Days">Alternative Days</option>
              <option value="Once a Week">Once a Week</option>
            </select>
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Assessment Type</label>
          <div className={styles.selectWrapper}>
            <select
              className={styles.select}
              value={assessmentType}
              onChange={(e) => setAssessmentType(e.target.value)}
            >
              <option value="">Select</option>
              <option value="Knowledge">Knowledge</option>
              <option value="Application">Application</option>
              <option value="Case scenario">Case scenario</option>
            </select>
          </div>
        </div>
      </div>

      <div className={styles.divider} />

      <h2 className={styles.sectionTitle}>Recommended Actions</h2>

      <div className={styles.row}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Proof of Work (PoW)</label>
          <div className={styles.selectWrapper}>
            <select
              className={styles.select}
              value={proofOfWork}
              onChange={(e) => setProofOfWork(e.target.value)}
            >
              <option value="">Select</option>
              <option value="Once a Week">Once a Week</option>
              <option value="Once in 2 Weeks">Once in 2 Weeks</option>
              <option value="Once in Full Program">Once in Full Program</option>
              <option value="None">None</option>
            </select>
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Proof of Action (PoA)</label>
          <div className={styles.selectWrapper}>
            <select
              className={styles.select}
              value={proofOfAction}
              onChange={(e) => setProofOfAction(e.target.value)}
            >
              <option value="">Select</option>
              <option value="Daily">Daily</option>
              <option value="Alternate Days">Alternate Days</option>
              <option value="Once a Week">Once a Week</option>
            </select>
          </div>
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Proof of Intent (PoI)</label>
          <div className={styles.selectWrapper}>
            <select
              className={styles.select}
              value={proofOfIntent}
              onChange={(e) => setProofOfIntent(e.target.value)}
            >
              <option value="">Select</option>
              <option value="Daily">Daily</option>
              <option value="Alternate Days">Alternate Days</option>
              <option value="Once a Week">Once a Week</option>
            </select>
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>General</label>
          <div className={styles.selectWrapper}>
            <select
              className={styles.select}
              value={generalEvidence}
              onChange={(e) => setGeneralEvidence(e.target.value)}
            >
              <option value="">Select</option>
              <option value="Daily">Daily</option>
              <option value="Alternate Days">Alternate Days</option>
              <option value="Once a Week">Once a Week</option>
            </select>
          </div>
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Include action prompting group discussion
          </label>
          <div className={styles.selectWrapper}>
            <select
              className={styles.select}
              value={includeGroupDiscussion}
              onChange={(e) => setIncludeGroupDiscussion(e.target.value)}
            >
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Frequency for group discussion prompts
          </label>
          <div className={styles.selectWrapper}>
            <select
              className={styles.select}
              value={groupDiscussionFrequency}
              onChange={(e) => setGroupDiscussionFrequency(e.target.value)}
            >
              <option value="">Select</option>
              <option value="Daily">Daily</option>
              <option value="Alternate Days">Alternate Days</option>
              <option value="Once a Week">Once a Week</option>
            </select>
          </div>
        </div>
      </div>

      <div className={styles.footerButtons}>
        <button
          className={styles.closeButton}
          onClick={onClose}
          disabled={isSubmitting}
        >
          Close
        </button>
        <button
          className={styles.submitButton}
          onClick={handleEstimateTokens}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Estimating..." : "Estimate Tokens Required"}
        </button>
      </div>
    </div>
  );
}
