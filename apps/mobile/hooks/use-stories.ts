import type { Category } from "@/components/category-filter";
import {
  fetchOGMetadata,
  getAskStories,
  getItems,
  getJobStories,
  getNewStories,
  getShowStories,
  getTopStories,
  type HNItem,
} from "@/lib/shared";
import {
  useInfiniteQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

export const PAGE_SIZE = 30;

export const STORY_CATEGORIES: Category[] = [
  "top",
  "new",
  "ask",
  "show",
  "jobs",
];

// Map category to the appropriate API fetcher function
const CATEGORY_FETCHERS = {
  top: getTopStories,
  new: getNewStories,
  ask: getAskStories,
  show: getShowStories,
  jobs: getJobStories,
} as const;

/**
 * Fetch one page of a category and populate the per-item cache so detail views
 * can reuse it. `getItems` may return fewer than PAGE_SIZE items (failed/deleted
 * fetches are dropped), but the page offset is always advanced by PAGE_SIZE
 * because it indexes into the raw ID list, not the resolved items.
 */
async function fetchCategoryPage(
  queryClient: QueryClient,
  category: Category,
  pageParam: number,
  { prefetchOG }: { prefetchOG: boolean }
): Promise<HNItem[]> {
  const ids = await CATEGORY_FETCHERS[category](pageParam, PAGE_SIZE);
  const items = await getItems(ids);

  // Populate individual item caches for reuse across different views
  items.forEach((item) => {
    queryClient.setQueryData(["item", item.id], item);
  });

  // Prefetch OG metadata only for the foreground category to avoid a render
  // waterfall; background-prefetched categories fetch OG data on demand.
  if (prefetchOG) {
    items.forEach((item) => {
      if (item.url) {
        queryClient.prefetchQuery({
          queryKey: ["og-metadata", item.url],
          queryFn: ({ signal }) => fetchOGMetadata(item.url!, signal),
          staleTime: 60 * 60 * 1000, // 1 hour
        });
      }
    });
  }

  return items;
}

// Stop paginating once a page yields no items (true end of the HN list). We
// can't key off `length < PAGE_SIZE` because getItems drops failed/deleted
// items, so a full page can legitimately resolve to fewer than PAGE_SIZE.
function getStoriesNextPageParam(
  lastPage: HNItem[],
  allPages: HNItem[][]
): number | undefined {
  if (lastPage.length === 0) return undefined;
  return allPages.length * PAGE_SIZE;
}

export function useStories(category: Category) {
  const queryClient = useQueryClient();

  return useInfiniteQuery<HNItem[], Error>({
    queryKey: ["stories", category],
    queryFn: ({ pageParam }) =>
      fetchCategoryPage(queryClient, category, pageParam as number, {
        prefetchOG: true,
      }),
    getNextPageParam: getStoriesNextPageParam,
    initialPageParam: 0,
  });
}

/**
 * Warm the first page of a category in the background for instant switching.
 * No-ops if the category is already cached. Skips OG prefetch to save bandwidth.
 */
export function prefetchCategory(queryClient: QueryClient, category: Category) {
  if (queryClient.getQueryData(["stories", category])) return;

  return queryClient.prefetchInfiniteQuery({
    queryKey: ["stories", category],
    queryFn: ({ pageParam }) =>
      fetchCategoryPage(queryClient, category, pageParam as number, {
        prefetchOG: false,
      }),
    initialPageParam: 0,
    getNextPageParam: getStoriesNextPageParam,
    pages: 1, // Only prefetch the first page
  });
}
