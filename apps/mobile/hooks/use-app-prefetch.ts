import { prefetchCategory, STORY_CATEGORIES } from "@/hooks/use-stories";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

/**
 * Prefetch all categories on app open for instant category switching.
 *
 * Strategy:
 * - Waits 1.5s after mount to let the initial category (Top) load first
 * - Warms the first page of every category in parallel (no OG metadata)
 * - prefetchCategory no-ops for anything already cached
 *
 * This is the single source of background category warming; the feed screen
 * relies on it rather than running its own predictive prefetch.
 */
export function useAppPrefetch() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => {
      STORY_CATEGORIES.forEach((category) => {
        prefetchCategory(queryClient, category);
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [queryClient]);
}
