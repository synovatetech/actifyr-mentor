// ============================================
// Programs Page - Program List
// Based on Figma design with exact styling
// ============================================

'use client';

import { useState, useRef, useCallback } from 'react';
import { ProgramCard } from '@/features/programs/components/ProgramCard';
import { ProgramCardSkeleton } from '@/components/features/programs/components/ProgramCardSkeleton';
import { usePrograms } from '@/hooks/usePrograms';
import { usePersistedScroll } from '@/hooks/usePersistedScroll';
import styles from '@/styles/programs-page.module.css';
import { Spinner } from '@/components/ui/Loader';

export default function ProgramsPage() {
  const [localSearch, setLocalSearch] = useState('');
  const [filterValue, setFilterValue] = useState<'all' | 'active' | 'draft' | 'expired'>('all');
  const { programs, loading, loadingMore, error, hasMore, searchQuery, setSearchQuery, loadMore, refetch } = usePrograms(filterValue);
  const [scrollRef, handleScroll] = usePersistedScroll<HTMLDivElement>('programs-page-scroll');
  const observerRef = useRef<IntersectionObserver | null>(null);

  const lastProgramElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    }, { rootMargin: '100px' });

    if (node) observerRef.current.observe(node);
  }, [loading, loadingMore, hasMore, loadMore]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localSearch);
  };

  return (
    <div ref={scrollRef} onScroll={handleScroll} className={styles.pageScroller}>
      {/* Page Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Program List</h1>

        {/* Search and Create Program */}
        <form onSubmit={handleSearch} className={styles.actions}>
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="Search by Program ID/Title"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchButton}>
              Search
            </button>
          </div>

          <div className={styles.filterContainer}>
            <select
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value as typeof filterValue)}
              className={styles.filterDropdown}
            >
              <option value="all">All Programs</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </form>
      </div>

      {/* Skeleton — initial load only */}
      {loading && programs.length === 0 && (
        <div className={styles.programsGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <ProgramCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className={styles.errorContainer}>
          <p>{error}</p>
          <button onClick={() => refetch()} className={styles.retryButton}>
            Retry
          </button>
        </div>
      )}

      {/* Programs Grid */}
      {!loading && !error && (
        <div className={styles.programsGrid}>
          {programs.map((program, index) => {
            if (index === programs.length - 1) {
              return (
                <div ref={lastProgramElementRef} key={program.id}>
                  <ProgramCard program={program} />
                </div>
              );
            }
            return <ProgramCard key={program.id} program={program} />;
          })}
        </div>
      )}

      {/* Loading More Indicator */}
      {loadingMore && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#6B7280', display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <Spinner size="medium" />
          <span style={{ marginTop: '10px' }}>Loading more programs...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && programs.length === 0 && (
        <div className={styles.emptyState}>
          <p>
            {searchQuery
              ? 'No programs found matching your search.'
              : filterValue !== 'all'
                ? `No ${filterValue} programs found.`
                : "You've not created any programs yet"}
          </p>
        </div>
      )}
    </div>
  );
}

