import type { Category } from "@/components/category-filter";
import {
  getAskStories,
  getItems,
  getJobStories,
  getNewStories,
  getShowStories,
  getTopStories,
} from "@/lib/shared";
import { queryKeys } from "@/lib/query-keys";
import { PAGE_SIZE } from "@/lib/shared/constants";
import type { QueryClient } from "@tanstack/react-query";

/** Map category to the appropriate API fetcher function */
export const CATEGORY_FETCHERS = {
  top: getTopStories,
  new: getNewStories,
  ask: getAskStories,
  show: getShowStories,
  jobs: getJobStories,
} as const;

/**
 * Prefetch a single category's first page of stories.
 * Skips if data is already cached. Populates individual item caches.
 */
export function prefetchCategory(
  queryClient: QueryClient,
  category: Category
): void {
  const existingData = queryClient.getQueryData(queryKeys.stories(category));
  if (existingData) return;

  queryClient.prefetchInfiniteQuery({
    queryKey: queryKeys.stories(category),
    queryFn: async ({ pageParam = 0 }) => {
      const storyFetcher = CATEGORY_FETCHERS[category];
      const ids = await storyFetcher(pageParam as number, PAGE_SIZE);
      const items = await getItems(ids);

      // Populate individual item caches for reuse across different views
      items.forEach((item) => {
        queryClient.setQueryData(queryKeys.item(item.id), item);
      });

      return items;
    },
    initialPageParam: 0,
    getNextPageParam: () => undefined, // Only prefetch first page
    pages: 1,
  });
}
