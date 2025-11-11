import type { Category } from "@/components/category-filter";
import {
  getAskStories,
  getItems,
  getJobStories,
  getNewStories,
  getShowStories,
  getTopStories,
} from "@/lib/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

const PREFETCH_PAGE_SIZE = 10; // Prefetch first 10 items per category

// Map category to the appropriate API fetcher function
const CATEGORY_FETCHERS = {
  top: getTopStories,
  new: getNewStories,
  ask: getAskStories,
  show: getShowStories,
  jobs: getJobStories,
} as const;

/**
 * Hook to prefetch all categories on app open for instant category switching
 *
 * Strategy:
 * - Waits 1.5s after mount to allow initial category (Top) to load first
 * - Prefetches first 10 items for all 5 categories in parallel
 * - Skips OG metadata prefetch to save bandwidth
 * - Total: 55 API calls (5 category ID lists + 50 item details)
 * - Completes in ~1-2 seconds
 */
export function useAppPrefetch() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Wait 1.5s to allow initial category to load first
    const timer = setTimeout(() => {
      const allCategories: Category[] = ["top", "new", "ask", "show", "jobs"];

      // Prefetch all categories in parallel
      allCategories.forEach((category) => {
        // Check if already cached to avoid unnecessary requests
        const existingData = queryClient.getQueryData(["stories", category]);
        if (!existingData) {
          queryClient.prefetchInfiniteQuery({
            queryKey: ["stories", category],
            queryFn: async ({ pageParam = 0 }) => {
              const storyFetcher = CATEGORY_FETCHERS[category];
              const ids = await storyFetcher(
                pageParam as number,
                PREFETCH_PAGE_SIZE
              );
              const items = await getItems(ids);

              // Populate individual item caches for reuse across different views
              items.forEach((item) => {
                queryClient.setQueryData(["item", item.id], item);
              });

              // Skip OG metadata prefetching for background-loaded categories
              // OG data will be fetched on-demand when user views the story

              return items;
            },
            initialPageParam: 0,
            getNextPageParam: () => {
              // Only prefetch first page, so always return undefined
              return undefined;
            },
            pages: 1, // Only prefetch first page
          });
        }
      });
    }, 1500);

    return () => {
      clearTimeout(timer);
    };
  }, [queryClient]);
}
