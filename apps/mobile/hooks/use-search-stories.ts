import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";

import { hnKeys, mapHitToHNItem, searchStories, type HNItem } from "@/lib/hn";

const HITS_PER_PAGE = 30;

interface SearchStoriesPage {
  hits: HNItem[];
  page: number;
  nbPages: number;
}

export function useSearchStories(query: string) {
  const trimmedQuery = query.trim();

  return useInfiniteQuery<
    SearchStoriesPage,
    Error,
    InfiniteData<SearchStoriesPage>,
    ["algolia-search", string],
    number
  >({
    queryKey: hnKeys.search(trimmedQuery),
    queryFn: async ({ pageParam }) => {
      const currentPage = pageParam;
      const response = await searchStories(
        trimmedQuery,
        currentPage,
        HITS_PER_PAGE
      );

      return {
        hits: response.hits.flatMap((hit) => mapHitToHNItem(hit) ?? []),
        page: response.page,
        nbPages: response.nbPages,
      };
    },
    getNextPageParam: (lastPage) => {
      const nextPage = lastPage.page + 1;
      return nextPage < lastPage.nbPages ? nextPage : undefined;
    },
    initialPageParam: 0,
    enabled: trimmedQuery.length > 0,
    staleTime: 60_000,
  });
}
