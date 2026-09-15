// ============================================
// Program Card Component
// Based on Figma design with exact styling
// ============================================

"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Program } from "@/types";
import styles from "@/styles/program-card.module.css";
import { useRouter } from "next/navigation";
import { useClientAdmin } from "@/hooks/useClientAdmin";

interface ProgramCardProps {
  program: Program;
}

// Maps a 0-100 progress value to a fill color bucket: 0-20% red, 21-50%
// orange, 51-80% yellow, 81-100% green.
function getProgressFillClass(value: number): string {
  const pct = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  if (pct <= 20) return styles.progressFillRed;
  if (pct <= 50) return styles.progressFillOrange;
  if (pct <= 80) return styles.progressFillYellow;
  return styles.progressFillGreen;
}

export function ProgramCard({ program }: ProgramCardProps) {
  const router = useRouter();
  const { current_active_plan_type } = useClientAdmin();
  const isCorporateAccount = current_active_plan_type === "corporate";
  const [mounted, setMounted] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showDescModal, setShowDescModal] = useState(false);
  const infoIconRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [titleTooltipPos, setTitleTooltipPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleProgramAdmin = () => {
    router.push(`/programAdmin/mentees?programId=${program.id}`);
  };

  const handleTitleMouseEnter = () => {
    const el = titleRef.current;
    if (el && el.scrollWidth > el.offsetWidth) {
      const rect = el.getBoundingClientRect();
      setTitleTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 7 });
    }
  };

  const handleTitleMouseLeave = () => setTitleTooltipPos(null);

  const handleInfoMouseEnter = () => {
    if (infoIconRef.current) {
      const rect = infoIconRef.current.getBoundingClientRect();
      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 7 });
    }
  };

  const handleInfoMouseLeave = () => setTooltipPos(null);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const calculateDuration = (startDate?: string, endDate?: string) => {
    if (!startDate || !endDate) return "N/A";

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return "N/A";

    // Reset time components for accurate day calculation
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return `${diffDays} Day${diffDays > 1 ? "s" : ""}`;
  };

  const renderRating = () => {
    if (program.rating === null) {
      return (
        <div className={styles.rating}>
          <svg width="13" height="12" viewBox="0 0 13 12" fill="none">
            <path
              d="M6.5 0L8.163 4.182L12.5 4.636L9.25 7.818L10.326 12L6.5 9.636L2.674 12L3.75 7.818L0.5 4.636L4.837 4.182L6.5 0Z"
              fill="rgba(0, 0, 0, 0.4)"
            />
          </svg>
          <span className={styles.noRating}>0</span>
        </div>
      );
    }

    return (
      <div className={styles.rating}>
        <span className={styles.ratingValueGreen}>
          {program.rating.toFixed(1)}
        </span>
        <svg width="13" height="12" viewBox="0 0 13 12" fill="none">
          <path
            d="M6.5 0L8.163 4.182L12.5 4.636L9.25 7.818L10.326 12L6.5 9.636L2.674 12L3.75 7.818L0.5 4.636L4.837 4.182L6.5 0Z"
            fill="#FEB50E"
          />
        </svg>
        {program.ratingCount && (
          <span className={styles.ratingCountValue}>
            ({program.ratingCount})
          </span>
        )}
      </div>
    );
  };

  const getProgramTypeLabel = (type?: string) => {
    switch (type) {
      case "modular_learning": return "Modular";
      case "journey_learning": return "Journey";
      default: return "Scheduled";
    }
  };

  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return styles.statusActive;
      case "draft":
        return styles.statusDraft;
      case "expired":
        return styles.statusExpired;
      default:
        return styles.statusActive;
    }
  };

  const getHeaderClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return styles.headerActive;
      case "draft":
        return styles.headerDraft;
      case "expired":
        return styles.headerExpired;
      default:
        return styles.headerActive;
    }
  };

  const isAiGenerating = Boolean(
    (program as Program & { is_ai_generating?: boolean }).isAIGenerating ??
    (program as Program & { is_ai_generating?: boolean }).is_ai_generating,
  );

  return (
    <div className={styles.card}>
      {/* Header Section with Gradient Background */}
      <div className={`${styles.header} ${getHeaderClass(program.status)}`}>
        <div className={styles.headerMain}>
          {/* Left Side: Image */}
          <div className={styles.imageSide}>
            {program.imageUrl && !imageError ? (
              <img
                src={program.imageUrl}
                alt={program.title}
                className={styles.image}
                onError={() => {
                  console.error("Image load failed:", program.imageUrl);
                  setImageError(true);
                }}
              />
            ) : (
              <div className={styles.imagePlaceholder}>
                <span className={styles.imagePlaceholderText}>Demo</span>
              </div>
            )}
          </div>

          {/* Right Side: Title, Facilitator, Date */}
          <div className={styles.infoSide}>
            <div className={styles.titleRow}>
              <h3
                ref={titleRef}
                className={styles.title}
                onMouseEnter={handleTitleMouseEnter}
                onMouseLeave={handleTitleMouseLeave}
              >
                <span className={styles.titleRegular}>
                  {program.programId} -{" "}
                </span>
                <span className={styles.titleBold}>{program.title}</span>
              </h3>
              {titleTooltipPos && mounted && createPortal(
                <div
                  className={styles.duplicateTooltip}
                  style={{
                    position: 'fixed',
                    left: `${titleTooltipPos.x}px`,
                    top: `${titleTooltipPos.y}px`,
                    transform: 'translateX(-50%) translateY(-100%)',
                    maxWidth: '300px',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                  }}
                >
                  {program.programId} - {program.title}
                </div>,
                document.body,
              )}

              {/* Status Badge - Shifted to be a sibling of title if needed or kept absolute */}
              <div
                className={`${styles.statusBadgeInline} ${getStatusClass(program.status)}`}
              >
                <span className={styles.statusText}>
                  {program.status.charAt(0).toUpperCase() +
                    program.status.slice(1)}
                </span>
              </div>
            </div>

            <div className={styles.facilitatorRow}>
              <div className={styles.facilitatorLeft}>
                <span className={styles.programTypeLabel}>{getProgramTypeLabel(program.type)}</span>
                <p className={styles.facilitator}>
                  Facilitated by{" "}
                  <span className={styles.facilitatorName}>
                    {program.facilitator}
                  </span>
                </p>
              </div>
              <div className={styles.ratingContainer}>
                {renderRating()}
              </div>
            </div>
          </div>
        </div>

        {program.description && (
          <div className={styles.descriptionContainer}>
            {program.duplicatedFromProgramId != null && (
              <div
                ref={infoIconRef}
                className={styles.duplicateInfoWrap}
                onMouseEnter={handleInfoMouseEnter}
                onMouseLeave={handleInfoMouseLeave}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="9" cy="9" r="9" fill="rgba(238,70,33,0.18)" />
                  <path d="M9 8v4.5" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
                  <circle cx="9" cy="5.8" r="0.9" fill="#ffffff" />
                </svg>
              </div>
            )}
            {tooltipPos && mounted && program.duplicatedFromProgramId != null && createPortal(
              <div
                className={styles.duplicateTooltip}
                style={{
                  position: 'fixed',
                  left: `${tooltipPos.x}px`,
                  top: `${tooltipPos.y}px`,
                  transform: 'translateX(-50%) translateY(-100%)',
                }}
              >
                Duplicated from Program ID: {program.duplicatedFromProgramId}
              </div>,
              document.body,
            )}
            <p className={styles.descriptionText}>
              {program.description.length > 55
                ? program.description.substring(0, 55) + "..."
                : program.description}
            </p>
            {program.description.length > 55 && (
              <button
                className={styles.readMoreBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDescModal(true);
                }}
              >
                Read More
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className={styles.content}>
        {/* Date Info */}
        <div className={styles.dateInfo}>
          <div className={styles.dateItem}>
            <span className={styles.dateLabel}>Program Start Date</span>
            <span className={styles.dateValue}>
              {formatDate(program.startDate)}
            </span>
          </div>
          <div className={styles.dateItem}>
            <span className={styles.dateLabel}>Program End Date</span>
            <span className={styles.dateValue}>
              {formatDate(program.endDate)}
            </span>
          </div>
          <div className={styles.dateItem}>
            <span className={styles.dateLabel}>Program Duration</span>
            <span className={styles.dateValue}>
              {calculateDuration(program.startDate, program.endDate)}
            </span>
          </div>
        </div>

        {/* Progress Bars */}
        <div className={styles.progressSection}>
          <div className={styles.progressItem}>
            <div className={styles.progressHeader}>
              <span className={styles.progressLabel}>
                {program.pi1Title || "Learning Engagement"}
              </span>
              <span className={styles.progressValue}>
                {program.learningEngagement}%
              </span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={`${styles.progressFill} ${getProgressFillClass(program.learningEngagement)}`}
                style={{ width: `${program.learningEngagement}%` }}
              />
            </div>
          </div>

          <div className={styles.progressItem}>
            <div className={styles.progressHeader}>
              <span className={styles.progressLabel}>
                {program.pi2Title || "Learning Effectiveness"}
              </span>
              <span className={styles.progressValue}>
                {program.learningEffectiveness}%
              </span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={`${styles.progressFill} ${getProgressFillClass(program.learningEffectiveness)}`}
                style={{ width: `${program.learningEffectiveness}%` }}
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          {!isCorporateAccount && (
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Cohort Size</span>
              <span className={styles.statValue}>{program.cohortSize}</span>
            </div>
          )}
          <div className={styles.statItem}>
            <span className={styles.statLabel}>{isCorporateAccount ? "Participants" : "Users Joined"}</span>
            <span className={styles.statValue}>{program.usersJoined}</span>
          </div>
        </div>

        {/* Program Admin Entry */}
        <button
          type="button"
          className={styles.programAdminButton}
          onClick={handleProgramAdmin}
        >
          Program Admin
        </button>
      </div>

      {isAiGenerating && (
        <div className={styles.aiGeneratingOverlay} aria-live="polite">
          <div className={styles.aiGeneratingBanner}>
            <div aria-hidden="true">
              <img
                src="/assets/danger.gif"
                className="w-[46px] h-[46px] object-contain"
                alt="AI Generating"
              />
            </div>
            <div className={styles.aiGeneratingTextBlock}>
              <p className={styles.aiGeneratingSubtitle}>
                Your AI-generated content is currently being prepared.
                You&apos;ll be notified once it&apos;s ready.
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Description Modal Popup */}
      {showDescModal &&
        createPortal(
          <div
            className={styles.modalOverlay}
            onClick={() => setShowDescModal(false)}
          >
            <div
              className={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Program Description</h3>
                <button
                  className={styles.closeModalBtn}
                  onClick={() => setShowDescModal(false)}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M18 6L6 18M6 6L18 18"
                      stroke="rgba(30, 30, 30, 0.8)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
              <div className={styles.modalBody}>
                <p className={styles.fullDescriptionText}>
                  {program.description}
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
