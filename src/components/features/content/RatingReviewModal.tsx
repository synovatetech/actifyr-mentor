"use client";

import dayjs from "dayjs";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  contentService,
  type ContentRatingsApiEnvelope,
  type ContentRatingsData,
} from "@/services/api/content.service";
import styles from "./RatingReviewModal.module.css";

type RatingReviewModalProps = {
  content: any;
  programId: string | number;
  onClose: () => void;
};

type ReviewItem = {
  id: string;
  name: string;
  rating: number;
  comment: string;
};

type ReviewCardProps = {
  name: string;
  rating: number;
  comment?: string;
};

const REVIEW_SKELETON_COUNT = 2;

const clampRating = (value: unknown) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(5, n));
};

const formatReviewDate = (dateInput: unknown) => {
  if (!dateInput) return "";
  const parsed = dayjs(String(dateInput));
  if (parsed.isValid()) return parsed.format("D MMM YYYY");
  return String(dateInput);
};

const getContentTitle = (content: any) => {
  return (
    content?.title ||
    content?.content_title ||
    content?.topic ||
    content?.name ||
    "Scheduled Content"
  );
};

const buildReviewItems = (content: any): ReviewItem[] => {
  const reviewSource =
    content?.review_details ||
    content?.reviews ||
    content?.ratings ||
    content?.feedbacks ||
    [];

  if (!Array.isArray(reviewSource)) return [];

  return reviewSource.map((item: any, index: number) => ({
    id: String(item?.id ?? index),
    name:
      item?.participant_name ||
      item?.name ||
      item?.user_name ||
      item?.employee_name ||
      "Participant",
    rating: clampRating(item?.rating ?? item?.score ?? item?.stars),
    comment:
      item?.comment ||
      item?.feedback ||
      item?.review ||
      item?.message ||
      item?.text ||
      "",
  }));
};

const buildReviewItemsFromApi = (data: ContentRatingsData): ReviewItem[] => {
  if (!Array.isArray(data.reviews)) return [];

  return data.reviews.map((item, index) => ({
    id: `${item.user_name}-${index}`,
    name: item.user_name || "Participant",
    rating: clampRating(item.rating),
    comment: item.review || "",
  }));
};

const getReviewerDisplayName = (rawName: string) => {
  if (!rawName) return "Participant";
  const base = rawName.includes("@") ? rawName.split("@")[0] : rawName;
  return base
    .replace(/[._-]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
};

const isEnvelopePayload = (
  value: ContentRatingsData | ContentRatingsApiEnvelope,
): value is ContentRatingsApiEnvelope => {
  return Boolean(
    value &&
      typeof value === "object" &&
      "data" in value &&
      "status" in value &&
      typeof (value as ContentRatingsApiEnvelope).status === "boolean",
  );
};

const renderStars = (rating: number) => {
  const rounded = Math.round(clampRating(rating));
  return Array.from({ length: 5 }).map((_, index) => {
    const isFilled = index < rounded;
    return (
      <svg
        key={index}
        width="16"
        height="15"
        viewBox="0 0 16 15"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={isFilled ? styles.reviewStarFilled : styles.reviewStarEmpty}
        aria-hidden="true"
      >
        <path
          d="M7.9996 12.5662L4.12169 14.8593C3.95037 14.9664 3.77127 15.0122 3.58439 14.9969C3.3975 14.9816 3.23397 14.9205 3.09381 14.8135C2.95364 14.7065 2.84462 14.5729 2.76675 14.4126C2.68888 14.2524 2.67331 14.0727 2.72003 13.8733L3.74791 9.53933L0.313855 6.62708C0.158115 6.4895 0.0609338 6.33265 0.0223104 6.15654C-0.016313 5.98043 -0.0047883 5.8086 0.0568846 5.64105C0.118557 5.4735 0.212001 5.33591 0.337216 5.22829C0.46243 5.12066 0.633744 5.05187 0.851156 5.02191L5.38318 4.63208L7.13525 0.550346C7.21312 0.366898 7.33397 0.229311 7.49781 0.137586C7.66165 0.045862 7.82891 0 7.9996 0C8.17029 0 8.33756 0.045862 8.50139 0.137586C8.66523 0.229311 8.78609 0.366898 8.86396 0.550346L10.616 4.63208L15.148 5.02191C15.3661 5.05248 15.5374 5.12128 15.662 5.22829C15.7866 5.3353 15.88 5.47289 15.9423 5.64105C16.0046 5.80921 16.0164 5.98135 15.9778 6.15746C15.9392 6.33357 15.8417 6.49011 15.6853 6.62708L12.2513 9.53933L13.2792 13.8733C13.3259 14.072 13.3103 14.2518 13.2325 14.4126C13.1546 14.5735 13.0456 14.7071 12.9054 14.8135C12.7652 14.9199 12.6017 14.981 12.4148 14.9969C12.2279 15.0128 12.0488 14.967 11.8775 14.8593L7.9996 12.5662Z"
          fill="currentColor"
        />
      </svg>
    );
  });
};

const ReviewCard = ({ name, rating, comment }: ReviewCardProps) => {
  return (
    <div className={styles.reviewCard}>
      <div className={styles.reviewCardTop}>
        <span className={styles.reviewUserName}>
          {getReviewerDisplayName(name)}
        </span>
        <div className={styles.reviewRatingGroup}>
          <span className={styles.starsRow}>{renderStars(rating)}</span>
        </div>
      </div>
      {comment ? <div className={styles.reviewComment}>{comment}</div> : null}
    </div>
  );
};

const ReviewCardSkeleton = () => {
  return (
    <div className={styles.reviewCard}>
      <div className={styles.reviewCardTop}>
        <Skeleton width={96} height={18} borderRadius={6} />
        <Skeleton width={96} height={15} borderRadius={6} />
      </div>
      <div className={styles.reviewComment}>
        <Skeleton count={2} height={14} borderRadius={6} />
      </div>
    </div>
  );
};

const ReviewListSkeleton = () => {
  return (
    <>
      {Array.from({ length: REVIEW_SKELETON_COUNT }).map((_, index) => (
        <ReviewCardSkeleton key={`skeleton-${index}`} />
      ))}
    </>
  );
};

export default function RatingReviewModal({
  content,
  programId,
  onClose,
}: RatingReviewModalProps) {
  const contentId = content?.content_id || content?.id;
  const ratingsQuery = useQuery<ContentRatingsData>({
    queryKey: ["content-ratings", String(contentId), String(programId)],
    queryFn: async () => {
      const response = await contentService.getRatings(contentId, programId);
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch content ratings");
      }
      const payload = response.data;
      if (isEnvelopePayload(payload)) {
        if (!payload.status) {
          throw new Error(payload.message || "Failed to fetch content ratings");
        }
        return payload.data;
      }
      return payload;
    },
    enabled: Boolean(contentId && programId),
  });

  useEffect(() => {
    if (ratingsQuery.data) {
      console.log("content ratings API response:", ratingsQuery.data);
    }
  }, [ratingsQuery.data]);

  const resolvedTitle =
    ratingsQuery.data?.content_title || getContentTitle(content);
  const resolvedDate =
    ratingsQuery.data?.review_date || content?.date || content?.scheduled_date;
  const averageRating = Number(
    ratingsQuery.data?.average_rating ??
      content?.average_content_rating ??
      content?.rating ??
      0,
  );
  const reviewItems = ratingsQuery.data
    ? buildReviewItemsFromApi(ratingsQuery.data)
    : buildReviewItems(content);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContainer}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            Review & Rating - {formatReviewDate(resolvedDate)}
          </div>
          <button
            type="button"
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Close review and rating modal"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 18L18 6M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.metaBlock}>
            <div className={styles.metaLine}>
              <span className={styles.metaLabel}>Content Title:</span>
              <span className={styles.metaValue}>{resolvedTitle}</span>
            </div>
            <div className={styles.metaLine}>
              <span className={styles.metaLabel}>Avg Rating:</span>
              <span className={styles.starsRow}>
                {renderStars(averageRating)}
              </span>
              <span className={styles.metaMutedValue}>
                ({averageRating.toFixed(1)})
              </span>
            </div>
          </div>

          <div className={styles.reviewList}>
            {ratingsQuery.isLoading ? (
              <ReviewListSkeleton />
            ) : reviewItems.length > 0 ? (
              reviewItems.map((review) => (
                <ReviewCard
                  key={review.id}
                  name={review.name}
                  rating={review.rating}
                  comment={review.comment}
                />
              ))
            ) : (
              <div className={styles.emptyReviewState}>
                No participant reviews available for this content yet.
              </div>
            )}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
