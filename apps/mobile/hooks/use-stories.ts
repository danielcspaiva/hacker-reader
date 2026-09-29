import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";

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

export const PAGE_SIZE = 30;

export const STORY_CATEGORIES: Category[] = [
  "top",
  "new",
  "ask",
  "show",
  "jobs",
];

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

  items.forEach((item) => {
    queryClient.setQueryData(["item", item.id], item);
  });

  // Prefetch OG only for the foreground category; background warming
  // fetches OG on demand to avoid a render waterfall.
  if (prefetchOG) {
    items.forEach((item) => {
      const url = item.url;
      if (url) {
        queryClient.prefetchQuery({
          queryKey: ["og-metadata", url],
          queryFn: ({ signal }) => fetchOGMetadata(url, signal),
          staleTime: 60 * 60 * 1000,
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

  return useInfiniteQuery<
    HNItem[],
    Error,
    InfiniteData<HNItem[]>,
    ["stories", Category],
    number
  >({
    queryKey: ["stories", category],
    queryFn: ({ pageParam }) =>
      fetchCategoryPage(queryClient, category, pageParam, {
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

  return queryClient.prefetchInfiniteQuery<
    HNItem[],
    Error,
    InfiniteData<HNItem[]>,
    ["stories", Category],
    number
  >({
    queryKey: ["stories", category],
    queryFn: ({ pageParam }) =>
      fetchCategoryPage(queryClient, category, pageParam, {
        prefetchOG: false,
      }),
    initialPageParam: 0,
    getNextPageParam: getStoriesNextPageParam,
    pages: 1,
  });
}
