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

// IMPORTANT: Must match PAGE_SIZE in use-stories.ts for proper pagination
const PAGE_SIZE = 30;

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
 * - Prefetches first 30 items for all 5 categories in parallel
 * - Skips OG metadata prefetch to save bandwidth
 * - Total: 155 API calls (5 category ID lists + 150 item details)
 * - Completes in ~2-3 seconds
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
                PAGE_SIZE
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
            getNextPageParam: (lastPage, allPages) => {
              // Only stop if we got 0 items (truly at the end)
              // Don't stop just because we got fewer than PAGE_SIZE, since some items may be deleted/filtered
              if (lastPage.length === 0) return undefined;
              return allPages.length * PAGE_SIZE;
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
