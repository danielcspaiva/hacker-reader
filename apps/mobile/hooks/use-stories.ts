import {
  infiniteQueryOptions,
  useInfiniteQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import {
  getCategoryStoryIds,
  getItems,
  hnKeys,
  type HNItem,
  type StoryCategory,
} from "@/lib/hn";
import { fetchOGMetadata } from "@/lib/link-preview/og";

const PAGE_SIZE = 30;

/**
 * Fetch one page of a category and populate the per-item cache so detail views
 * can reuse it. `getItems` may return fewer than PAGE_SIZE items (failed/deleted
 * fetches are dropped), but the page offset is always advanced by PAGE_SIZE
 * because it indexes into the raw ID list, not the resolved items.
 */
async function fetchCategoryPage(
  queryClient: QueryClient,
  category: StoryCategory,
  pageParam: number,
  { prefetchOG }: { prefetchOG: boolean }
): Promise<HNItem[]> {
  const ids = await getCategoryStoryIds(category, pageParam, PAGE_SIZE);
  const items = await getItems(ids);

  items.forEach((item) => {
    queryClient.setQueryData(hnKeys.item(item.id), item);
  });

  // Prefetch OG only for the foreground category; background warming
  // fetches OG on demand to avoid a render waterfall.
  if (prefetchOG) {
    items.forEach((item) => {
      const url = item.url;
      if (url) {
        queryClient.prefetchQuery({
          queryKey: hnKeys.ogMetadata(url),
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

function storiesQueryOptions(
  queryClient: QueryClient,
  category: StoryCategory,
  { prefetchOG }: { prefetchOG: boolean }
) {
  return infiniteQueryOptions({
    queryKey: hnKeys.stories(category),
    queryFn: ({ pageParam }) =>
      fetchCategoryPage(queryClient, category, pageParam, { prefetchOG }),
    initialPageParam: 0,
    getNextPageParam: getStoriesNextPageParam,
  });
}

export function useStories(category: StoryCategory) {
  const queryClient = useQueryClient();
  return useInfiniteQuery(
    storiesQueryOptions(queryClient, category, { prefetchOG: true })
  );
}

/**
 * Warm the first page of a category in the background for instant switching.
 * No-ops if the category is already cached. Skips OG prefetch to save bandwidth.
 */
export function prefetchCategory(
  queryClient: QueryClient,
  category: StoryCategory
) {
  if (queryClient.getQueryData(hnKeys.stories(category))) return;

  return queryClient.prefetchInfiniteQuery({
    ...storiesQueryOptions(queryClient, category, { prefetchOG: false }),
    pages: 1,
  });
}
