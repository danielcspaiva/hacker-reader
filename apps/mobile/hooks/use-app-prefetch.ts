import type { Category } from "@/components/category-filter";
import { prefetchCategory } from "@/hooks/prefetch-utils";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

/**
 * Hook to prefetch all categories on app open for instant category switching
 *
 * Strategy:
 * - Waits 1.5s after mount to allow initial category (Top) to load first
 * - Prefetches first 30 items for all 5 categories in parallel
 * - Skips OG metadata prefetch to save bandwidth
 */
export function useAppPrefetch() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => {
      const allCategories: Category[] = ["top", "new", "ask", "show", "jobs"];
      allCategories.forEach((category) => {
        prefetchCategory(queryClient, category);
      });
    }, 1500);

    return () => {
      clearTimeout(timer);
    };
  }, [queryClient]);
}
