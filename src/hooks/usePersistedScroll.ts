import { useRef, useCallback } from "react";

/**
 * Returns a [ref, onScroll] pair for a scrollable element.
 * - Attach `ref` to the element: scroll position is restored whenever the element mounts.
 * - Attach `onScroll` to the element: current scroll position is saved on each scroll event.
 *
 * Pass a `storageKey` to persist across navigation (uses sessionStorage).
 * Without a key, position is saved in a ref — survives re-renders but not unmounts.
 */
export function usePersistedScroll<T extends HTMLElement = HTMLDivElement>(
  storageKey?: string,
): [
  (el: T | null) => void,
  React.UIEventHandler<T>,
] {
  const savedScroll = useRef<number>(0);

  const read = useCallback((): number => {
    if (!storageKey) return savedScroll.current;
    try {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (nav?.type === 'reload') {
        sessionStorage.removeItem(storageKey);
        return 0;
      }
      return Number(sessionStorage.getItem(storageKey) ?? 0);
    } catch {
      return 0;
    }
  }, [storageKey]);

  const write = useCallback((value: number) => {
    savedScroll.current = value;
    if (!storageKey) return;
    try {
      sessionStorage.setItem(storageKey, String(value));
    } catch {
      // sessionStorage unavailable (private browsing quota, etc.) — silently ignore
    }
  }, [storageKey]);

  const ref = useCallback((el: T | null) => {
    if (el) {
      el.scrollTop = read();
    }
  }, [read]);

  const onScroll = useCallback((e: React.UIEvent<T>) => {
    write(e.currentTarget.scrollTop);
  }, [write]);

  return [ref, onScroll];
}
