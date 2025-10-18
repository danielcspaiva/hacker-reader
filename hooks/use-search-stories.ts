import { useInfiniteQuery } from '@tanstack/react-query';

import type { HNItem } from '@/lib/hn-api';
import { searchStories } from '@/lib/algolia-api';

const HITS_PER_PAGE = 30;

interface SearchStoriesPage {
  hits: HNItem[];
  page: number;
  nbPages: number;
}

function mapHitToHNItem(hit: Awaited<ReturnType<typeof searchStories>>['hits'][number]): HNItem {
  const parsedId = Number.parseInt(hit.objectID, 10);
  const id = Number.isNaN(parsedId) ? hit.created_at_i : parsedId;

  return {
    id,
    title: hit.title ?? undefined,
    url: hit.url ?? undefined,
    by: hit.author ?? undefined,
    score: hit.points ?? undefined,
    descendants: hit.num_comments ?? undefined,
    time: hit.created_at_i ?? undefined,
    text: hit.story_text ?? undefined,
    type: 'story',
  };
}

export function useSearchStories(query: string) {
  const trimmedQuery = query.trim();

  return useInfiniteQuery<SearchStoriesPage, Error>({
    queryKey: ['algolia-search', trimmedQuery],
    queryFn: async ({ pageParam = 0 }) => {
      const currentPage = typeof pageParam === 'number' ? pageParam : 0;
      const response = await searchStories(trimmedQuery, currentPage, HITS_PER_PAGE);

      return {
        hits: response.hits.map(mapHitToHNItem),
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
