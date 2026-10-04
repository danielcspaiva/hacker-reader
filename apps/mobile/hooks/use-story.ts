import {
  queryOptions,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";

import {
  getItem,
  getItems,
  getStoryWithComments,
  hnKeys,
  mergeAlgoliaWithHNKids,
  convertHNItemToComment,
  type Comment,
  type HNItem,
  type StoryWithComments,
} from "@/lib/hn";

/**
 * Reflect a freshly fetched story's live fields (score, comment count, title)
 * into every category list cache that already contains it, plus the per-item
 * cache, so feed cards stay in sync without triggering another fetch.
 */
function syncStoryIntoCaches(queryClient: QueryClient, hnItem: HNItem): void {
  queryClient.setQueriesData<InfiniteData<HNItem[]>>(
    { queryKey: hnKeys.allStories() },
    (oldData) => {
      if (!oldData?.pages) return oldData;

      return {
        ...oldData,
        pages: oldData.pages.map((page) =>
          page.map((item) =>
            item.id === hnItem.id
              ? {
                  ...item,
                  descendants: hnItem.descendants,
                  score: hnItem.score ?? 0,
                  title: hnItem.title,
                }
              : item
          )
        ),
      };
    }
  );

  queryClient.setQueryData<HNItem>(hnKeys.item(hnItem.id), hnItem);
}

/** Matches the root QueryClient default so a prefetch and an open share one cache entry. */
const STORY_STALE_TIME = 2 * 60 * 1000;

/**
 * The story-detail query: Firebase item plus the Algolia thread. `useStory`
 * and `prefetchStory` both use this so a warm prefetch is a cache hit, not a
 * second request under a different key.
 */
export function storyQueryOptions(queryClient: QueryClient, id: number) {
  return queryOptions({
    queryKey: hnKeys.story(id),
    queryFn: async ({ signal }): Promise<StoryWithComments> => {
      const [hnItem, algoliaData] = await Promise.all([
        getItem(id, signal),
        getStoryWithComments(id, signal),
      ]);
      if (!hnItem) throw new Error(`Story ${id} not found`);

      const { comments: convertedComments, missingIds } =
        mergeAlgoliaWithHNKids(algoliaData.children, hnItem.kids);

      let missingComments: Comment[] = [];
      if (missingIds.length > 0) {
        // Algolia already gave the bulk of the thread; if the top-up fetch
        // fails outright, show what we have instead of failing the screen.
        const missingHNItems = await getItems(missingIds, signal).catch(
          () => []
        );

        missingComments = missingHNItems
          .map(convertHNItemToComment)
          .filter((c): c is Comment => c !== null);
      }

      const story: StoryWithComments = {
        id: hnItem.id,
        title: hnItem.title ?? "",
        url: hnItem.url,
        text: hnItem.text,
        by: hnItem.by ?? "",
        time: hnItem.time ?? 0,
        score: hnItem.score ?? 0,
        descendants: hnItem.descendants,
        comments: [...convertedComments, ...missingComments],
      };

      syncStoryIntoCaches(queryClient, hnItem);

      return story;
    },
    staleTime: STORY_STALE_TIME,
    refetchOnWindowFocus: true,
  });
}

export function useStory(id: number) {
  const queryClient = useQueryClient();

  return useQuery({
    ...storyQueryOptions(queryClient, id),
    enabled: !!id,
  });
}

/** Warm `hnKeys.story(id)`. No-ops while that entry is still fresh. Errors stay in the cache and are not thrown. */
export function prefetchStory(
  queryClient: QueryClient,
  id: number
): Promise<void> {
  return queryClient.prefetchQuery(storyQueryOptions(queryClient, id));
}
