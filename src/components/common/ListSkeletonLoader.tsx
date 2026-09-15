"use client";

interface ListSkeletonLoaderProps {
  rows?: number;
}

export default function ListSkeletonLoader({
  rows = 8,
}: ListSkeletonLoaderProps) {
  return (
    <div className="w-full" role="status" aria-label="Loading list">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className="border-b border-gray-50 pb-2 last:border-b-0"
        >
          <div className="h-[50px] w-full animate-pulse rounded-[4px] bg-gray-200" />
        </div>
      ))}
    </div>
  );
}
