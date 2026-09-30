import {
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

export function useStory(id: number) {
  const queryClient = useQueryClient();

  return useQuery<StoryWithComments, Error>({
    queryKey: hnKeys.story(id),
    queryFn: async ({ signal }) => {
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
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
