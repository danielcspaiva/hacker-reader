import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";

import {
  hasSearchableQuery,
  hnKeys,
  mapHitToCommentHit,
  mapHitToHNItem,
  searchStories,
  type HNItem,
  type SearchCommentHit,
  type SearchOptions,
} from "@/lib/hn";

const HITS_PER_PAGE = 30;

interface SearchPage {
  /** Story hits (scope "story"); empty for comment scope. */
  hits: HNItem[];
  /** Comment hits (scope "comment"); empty for story scope. */
  commentHits: SearchCommentHit[];
  page: number;
  nbPages: number;
}

export function useSearchStories(
  query: string,
  options: SearchOptions,
  enabled = true
) {
  const trimmedQuery = query.trim();

  return useInfiniteQuery<
    SearchPage,
    Error,
    InfiniteData<SearchPage>,
    ReturnType<typeof hnKeys.search>,
    number
  >({
    queryKey: hnKeys.search(trimmedQuery, options),
    queryFn: async ({ pageParam, signal }) => {
      const response = await searchStories(
        trimmedQuery,
        pageParam,
        HITS_PER_PAGE,
        signal,
        options
      );
      const isComments = options.scope === "comment";

      return {
        hits: isComments
          ? []
          : response.hits.flatMap((hit) => mapHitToHNItem(hit) ?? []),
        commentHits: isComments
          ? response.hits.flatMap((hit) => mapHitToCommentHit(hit) ?? [])
          : [],
        page: response.page,
        nbPages: response.nbPages,
      };
    },
    getNextPageParam: (lastPage) => {
      const nextPage = lastPage.page + 1;
      return nextPage < lastPage.nbPages ? nextPage : undefined;
    },
    initialPageParam: 0,
    enabled: enabled && hasSearchableQuery(trimmedQuery),
    staleTime: 60_000,
  });
}
