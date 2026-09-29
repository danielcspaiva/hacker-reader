import {
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";

import { STORY_CATEGORIES } from "@/hooks/use-stories";
import { getItem, getItems } from "@/lib/shared";
import {
  getStoryWithComments,
  type AlgoliaComment,
} from "@/lib/shared/api/algolia-api";
import type { HNItem } from "@/lib/shared/types";

export interface StoryWithComments {
  id: number;
  title: string;
  url?: string;
  text?: string;
  by: string;
  time: number;
  score: number;
  descendants?: number;
  comments: Comment[];
}

export interface Comment {
  id: number;
  by: string;
  time: number;
  text?: string;
  deleted?: boolean;
  dead?: boolean;
  children: Comment[];
}

function convertHNItemToComment(hnItem: HNItem): Comment | null {
  if (hnItem.deleted || hnItem.dead || !hnItem.by || !hnItem.text) {
    return null;
  }

  return {
    id: hnItem.id,
    by: hnItem.by,
    time: hnItem.time ?? 0,
    text: hnItem.text,
    children: [],
  };
}

function convertAlgoliaComment(algoliaComment: AlgoliaComment): Comment | null {
  if (!algoliaComment.author || !algoliaComment.text) {
    return null;
  }

  const convertedChildren = algoliaComment.children
    .map(convertAlgoliaComment)
    .filter((c): c is Comment => c !== null);

  return {
    id: algoliaComment.id,
    by: algoliaComment.author,
    time: algoliaComment.created_at_i,
    text: algoliaComment.text,
    children: convertedChildren,
  };
}

function collectAlgoliaCommentIds(comments: AlgoliaComment[]): Set<number> {
  const ids = new Set<number>();

  function traverse(comment: AlgoliaComment) {
    ids.add(comment.id);
    comment.children.forEach(traverse);
  }

  comments.forEach(traverse);
  return ids;
}

// Only top-level kids: nested HN fetches are sequential and too slow
// (hundreds of comments → tens of seconds). Deleted nested comments are rare.
function filterAlgoliaCommentsByHNKids(
  comments: AlgoliaComment[],
  hnKids: number[]
): AlgoliaComment[] {
  const hnKidsSet = new Set(hnKids);
  return comments.filter((comment) => hnKidsSet.has(comment.id));
}

/**
 * Reflect a freshly fetched story's live fields (score, comment count, title)
 * into every category list cache that already contains it, plus the per-item
 * cache, so feed cards stay in sync without triggering another fetch.
 */
function syncStoryIntoCaches(queryClient: QueryClient, hnItem: HNItem): void {
  STORY_CATEGORIES.forEach((category) => {
    queryClient.setQueriesData<InfiniteData<HNItem[]>>(
      { queryKey: ["stories", category] },
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
  });

  queryClient.setQueryData<HNItem>(["item", hnItem.id], hnItem);
}

export function useStory(id: number) {
  const queryClient = useQueryClient();

  return useQuery<StoryWithComments, Error>({
    queryKey: ["story", id],
    queryFn: async () => {
      const [hnItem, algoliaData] = await Promise.all([
        getItem(id),
        getStoryWithComments(id),
      ]);

      const topLevelHNKids = hnItem.kids || [];

      const filteredAlgoliaComments =
        topLevelHNKids.length > 0
          ? filterAlgoliaCommentsByHNKids(algoliaData.children, topLevelHNKids)
          : [];

      const convertedComments = filteredAlgoliaComments
        .map(convertAlgoliaComment)
        .filter((c): c is Comment => c !== null);

      let missingComments: Comment[] = [];

      if (hnItem.kids && hnItem.kids.length > 0) {
        const algoliaCommentIds = collectAlgoliaCommentIds(
          filteredAlgoliaComments
        );

        const missingCommentIds = hnItem.kids.filter(
          (kidId) => !algoliaCommentIds.has(kidId)
        );

        if (missingCommentIds.length > 0) {
          const missingHNItems = await getItems(missingCommentIds);

          missingComments = missingHNItems
            .map(convertHNItemToComment)
            .filter((c): c is Comment => c !== null);
        }
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
