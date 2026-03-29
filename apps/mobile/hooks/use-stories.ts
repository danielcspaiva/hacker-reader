import type { Category } from "@/components/category-filter";
import { CATEGORY_FETCHERS, prefetchCategory } from "@/hooks/prefetch-utils";
import {
  fetchOGMetadata,
  getItems,
  type HNItem,
} from "@/lib/shared";
import { PAGE_SIZE } from "@/lib/shared/constants";
import { queryKeys } from "@/lib/query-keys";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

// Predictive prefetching: which categories to prefetch based on current category
const PREFETCH_STRATEGY: Record<Category, Category[]> = {
  top: ["new"], // Most common: Top → New
  new: ["top", "ask"], // New → Top (back) or Ask
  ask: ["show"], // Ask → Show
  show: ["jobs"], // Show → Jobs
  jobs: ["show"], // Jobs → Show (back)
};

export function useStories(category: Category) {
  const queryClient = useQueryClient();

  return useInfiniteQuery<HNItem[], Error>({
    queryKey: queryKeys.stories(category),
    queryFn: async ({ pageParam = 0 }) => {
      const storyFetcher = CATEGORY_FETCHERS[category];
      const ids = await storyFetcher(pageParam as number, PAGE_SIZE);
      const items = await getItems(ids);

      // Populate individual item caches for reuse across different views
      items.forEach((item) => {
        queryClient.setQueryData(queryKeys.item(item.id), item);
      });

      // Prefetch OG metadata for stories with URLs to avoid waterfall
      items.forEach((item) => {
        if (item.url) {
          queryClient.prefetchQuery({
            queryKey: queryKeys.ogMetadata(item.url!),
            queryFn: ({ signal }) => fetchOGMetadata(item.url!, signal),
            staleTime: 60 * 60 * 1000, // 1 hour
          });
        }
      });

      return items;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
    initialPageParam: 0,
  });
}

/**
 * Hook to intelligently prefetch category data in the background
 *
 * Strategy:
 * 1. Immediate: Prefetch predictive next categories after current loads (2s delay)
 * 2. Idle: Prefetch all remaining categories after 5s of idle time
 */
export function usePrefetchCategories(
  currentCategory: Category,
  isLoading: boolean,
  hasData: boolean
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Don't prefetch if current category is still loading or has no data
    if (isLoading || !hasData) return;

    // Step 1: Predictive prefetching (after 2s delay)
    const predictiveTimer = setTimeout(() => {
      const categoriesToPrefetch = PREFETCH_STRATEGY[currentCategory];
      categoriesToPrefetch.forEach((category) => {
        prefetchCategory(queryClient, category);
      });
    }, 2000);

    // Step 2: Idle prefetching of all remaining categories (after 5s)
    const idleTimer = setTimeout(() => {
      const allCategories: Category[] = ["top", "new", "ask", "show", "jobs"];
      const remainingCategories = allCategories.filter(
        (cat) =>
          cat !== currentCategory &&
          !PREFETCH_STRATEGY[currentCategory].includes(cat)
      );

      remainingCategories.forEach((category) => {
        prefetchCategory(queryClient, category);
      });
    }, 5000);

    return () => {
      clearTimeout(predictiveTimer);
      clearTimeout(idleTimer);
    };
  }, [currentCategory, isLoading, hasData, queryClient]);
}
