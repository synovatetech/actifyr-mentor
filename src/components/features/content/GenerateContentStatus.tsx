"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import styles from "@/styles/ai-content.module.css";
import Image from "next/image";
import { aiService } from "@/services/api/ai.service";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

interface GenerateContentStatusProps {
  onReturn: () => void;
  onViewContent: () => void;
  programConfigId: number | null;
  tocItems?: any[];
  programId: string;
}

export function GenerateContentStatus({
  onReturn,
  onViewContent,
  programConfigId,
  tocItems,
  programId,
}: GenerateContentStatusProps) {
  const POLL_INTERVAL_MS = 3000;
  const MAX_POLL_ATTEMPTS = 200; // ~10 minutes

  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(true);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollAttemptRef = useRef(0);
  const activeGenerationIdRef = useRef(0);
  const isMountedRef = useRef(false);

  const clearPolling = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  const normalizeStatus = (value: unknown): string =>
    typeof value === "string" ? value.toLowerCase() : "";

  const isCompletedStatus = (status: string) =>
    ["completed", "complete", "success", "succeeded", "done"].includes(status);

  const isInProgressStatus = (status: string) =>
    ["pending", "generating", "processing", "queued", "in_progress"].includes(
      status,
    );

  const isFailedStatus = (status: string) =>
    ["failed", "error", "cancelled", "canceled"].includes(status);

  const getPollResult = useCallback(async () => {
    if (!programConfigId) {
      return {
        state: "failed" as const,
        error: "Missing program configuration ID.",
      };
    }

    try {
      const payload: any = {
        toc_config_id: programConfigId,
        program_config_id: programConfigId,
        program_id: programId,
      };
      const response = await aiService.generateDaywiseContent(payload);

      if (!response.success) {
        return {
          state: "failed" as const,
          error: response.error || "Failed to check generation status.",
        };
      }

      const topLevelStatus = normalizeStatus(
        response.data?.status || response.data?.data?.status,
      );
      if (isCompletedStatus(topLevelStatus)) {
        return { state: "completed" as const };
      }
      if (isFailedStatus(topLevelStatus)) {
        return {
          state: "failed" as const,
          error: "Content generation failed.",
        };
      }

      const rawItems =
        response.data?.items ||
        response.data?.data?.items ||
        response.data ||
        [];
      const items = Array.isArray(rawItems) ? rawItems : [];
      const scopedItems = items.filter((item: any) => {
        const tocConfigId = item.toc_config_id ?? item.table_of_content_id;
        const itemProgramId = item.program_id;
        const configMatch =
          tocConfigId != null &&
          Number(tocConfigId) === Number(programConfigId);
        const programMatch =
          itemProgramId != null && String(itemProgramId) === String(programId);
        return configMatch || programMatch;
      });

      if (
        scopedItems.some((item: any) =>
          isFailedStatus(normalizeStatus(item?.status)),
        )
      ) {
        return {
          state: "failed" as const,
          error: "Content generation failed for one or more items.",
        };
      }

      if (scopedItems.length === 0) {
        return { state: "in_progress" as const };
      }

      const pendingItems = scopedItems.filter((item: any) =>
        isInProgressStatus(normalizeStatus(item?.status)),
      );

      if (pendingItems.length > 0) {
        return { state: "in_progress" as const };
      }

      // If TOC is present, wait until generated content count catches up.
      if (tocItems?.length && scopedItems.length < tocItems.length) {
        return { state: "in_progress" as const };
      }

      return { state: "completed" as const };
    } catch (error: any) {
      return {
        state: "failed" as const,
        error: error?.message || "Failed to check generation status.",
      };
    }
  }, [programConfigId, programId, tocItems]);

  const startPolling = useCallback(
    (generationId: number) => {
      clearPolling();
      pollAttemptRef.current = 0;

      const poll = async () => {
        if (
          !isMountedRef.current ||
          generationId !== activeGenerationIdRef.current
        ) {
          return;
        }

        const result = await getPollResult();
        if (
          !isMountedRef.current ||
          generationId !== activeGenerationIdRef.current
        ) {
          return;
        }

        if (result.state === "completed") {
          clearPolling();
          toast.success("Generated successfully!");
          setGenerationError(null);
          setIsGenerating(false);
          return;
        }

        if (result.state === "failed") {
          clearPolling();
          toast.error(result.error || "Generation failed");
          setGenerationError(result.error || "Generation failed");
          setIsGenerating(false);
          return;
        }

        pollAttemptRef.current += 1;
        if (pollAttemptRef.current >= MAX_POLL_ATTEMPTS) {
          clearPolling();
          const timeoutMsg =
            "Generation is taking longer than expected. Please return later and check again.";
          toast.error(timeoutMsg);
          setGenerationError(timeoutMsg);
          setIsGenerating(false);
          return;
        }

        pollTimeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      };

      poll();
    },
    [clearPolling, getPollResult],
  );

  const runGeneration = useCallback(async () => {
    const generationId = activeGenerationIdRef.current + 1;
    activeGenerationIdRef.current = generationId;
    clearPolling();
    pollAttemptRef.current = 0;
    setGenerationError(null);
    setIsGenerating(true);

    if (!programConfigId) {
      setGenerationError("Missing program configuration ID.");
      setIsGenerating(false);
      return;
    }

    try {
      const payload: any = {
        toc_config_id: programConfigId,
        program_config_id: programConfigId,
        program_id: programId,
      };
      const response = await aiService.generateDaywiseContent(payload);
      if (
        !isMountedRef.current ||
        generationId !== activeGenerationIdRef.current
      ) {
        return;
      }

      if (response.success) {
        const status = normalizeStatus(response.data?.status);

        if (isCompletedStatus(status)) {
          toast.success("Generated successfully!");
          setGenerationError(null);
          setIsGenerating(false);
          return;
        }

        if (isFailedStatus(status)) {
          const errMsg = response.error || "Generation failed";
          toast.error(errMsg);
          setGenerationError(errMsg);
          setIsGenerating(false);
          return;
        }

        if (isInProgressStatus(status) || status === "") {
          startPolling(generationId);
          return;
        }

        // Unknown status: continue polling to avoid false success.
        startPolling(generationId);
      } else {
        const errMsg = response.error || "Generation failed";
        toast.error(errMsg);
        setGenerationError(errMsg);
        setIsGenerating(false);
      }
    } catch (err: any) {
      if (
        !isMountedRef.current ||
        generationId !== activeGenerationIdRef.current
      ) {
        return;
      }
      console.error(err);
      const errMsg = err?.message || "An error occurred";
      toast.error(errMsg);
      setGenerationError(errMsg);
      setIsGenerating(false);
    }
  }, [clearPolling, programConfigId, programId, startPolling]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      activeGenerationIdRef.current += 1;
      clearPolling();
    };
  }, [clearPolling]);

  useEffect(() => {
    runGeneration();
  }, [clearPolling, runGeneration, tocItems]);

  if (isGenerating) {
    return (
      <div className={styles.statusContainer}>
        <div className={styles.loaderGif}>
          <Image
            src="/assets/ai/loader.gif"
            alt="AI Generation in progress"
            width={200}
            height={200}
            unoptimized
          />
        </div>
        <h1 className={styles.statusTitle} style={{ color: "#1F2937" }}>
          Content generation in progress
        </h1>
        <p className={styles.statusSubtext + " whitespace-pre-line"}>
          {`  We’re generating your content. This may take a few minutes.\n You can continue with other tasks and return later to review and publish—your content will \n be saved as a draft`}
        </p>
        <button
          className={styles.returnButton}
          onClick={() => {
            activeGenerationIdRef.current += 1;
            clearPolling();
            router.push("/programs");
          }}
        >
          Return later
        </button>
      </div>
    );
  }

  if (generationError) {
    return (
      <div className={styles.statusContainer}>
        <div
          className={styles.errorIcon}
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            backgroundColor: "#FEE2E2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "24px",
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 9V14M12 17.5V18M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22Z"
              stroke="#EF4444"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className={styles.statusTitle} style={{ color: "#1F2937" }}>
          Content Generation Failed
        </h1>
        <p className={styles.statusSubtext} style={{ color: "#EF4444" }}>
          {generationError}
        </p>
        <div className={"flex gap-4"}>
          <button
            className={styles.returnButton}
            onClick={() => {
              activeGenerationIdRef.current += 1;
              clearPolling();
              onReturn();
            }}
            style={{ width: "auto", padding: "12px 24px" }}
          >
            Go Back
          </button>
          <button
            className={styles.viewContentButton}
            onClick={async () => {
              setGenerationError(null);
              setIsGenerating(true);
              await runGeneration();
            }}
            style={{ width: "auto", padding: "12px 24px" }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.statusContainer}>
      <div className={styles.successIcon}>
        <svg
          width="60"
          height="60"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20 6L9 17L4 12"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h1 className={styles.statusTitle}>Content Generated Successfully</h1>
      <p className={styles.statusSubtext}>
        Your content has been generated successfully and is added for your
        review.
      </p>
      <div className={styles.buttonRow}>
        <button
          className={styles.viewContentButton}
          onClick={() => {
            activeGenerationIdRef.current += 1;
            clearPolling();
            onViewContent();
          }}
        >
          Review Content
        </button>
      </div>
    </div>
  );
}
