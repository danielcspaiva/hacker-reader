import { STORY_CATEGORIES } from "@/hooks/use-stories";
import { getItem, getItems } from "@/lib/shared";
import {
  getStoryWithComments,
  type AlgoliaComment,
} from "@/lib/shared/api/algolia-api";
import type { HNItem } from "@/lib/shared/types";
import {
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";

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

// Convert HN API item to our Comment format
function convertHNItemToComment(hnItem: HNItem): Comment | null {
  // Skip deleted, dead, or invalid comments
  if (hnItem.deleted || hnItem.dead || !hnItem.by || !hnItem.text) {
    return null;
  }

  return {
    id: hnItem.id,
    by: hnItem.by,
    time: hnItem.time ?? 0,
    text: hnItem.text,
    children: [], // HN API comments don't have nested children pre-fetched
  };
}

// Convert Algolia format to our app's format
function convertAlgoliaComment(algoliaComment: AlgoliaComment): Comment | null {
  // Skip deleted or invalid comments
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

// Collect all comment IDs from Algolia tree (recursively)
function collectAlgoliaCommentIds(comments: AlgoliaComment[]): Set<number> {
  const ids = new Set<number>();

  function traverse(comment: AlgoliaComment) {
    ids.add(comment.id);
    comment.children.forEach(traverse);
  }

  comments.forEach(traverse);
  return ids;
}

// Filter Algolia comments to only include top-level comments present in HN API's kids array
// This removes deleted top-level comments while trusting Algolia for nested structure (for performance)
function filterAlgoliaCommentsByHNKids(
  comments: AlgoliaComment[],
  hnKids: number[]
): AlgoliaComment[] {
  const hnKidsSet = new Set(hnKids);

  // Only filter top-level comments - trust Algolia for nested structure
  return comments.filter((comment) => hnKidsSet.has(comment.id));
}

// Note: We used to recursively fetch all nested HN kids here, but that was extremely slow
// for stories with many comments (200 comments = 200 sequential API calls = 40+ seconds).
// Now we only validate top-level comments against HN API and trust Algolia for the nested structure.
// This is much faster and deleted nested comments are rare anyway.

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

  // Also update the individual item cache
  queryClient.setQueryData<HNItem>(["item", hnItem.id], hnItem);
}

export function useStory(id: number) {
  const queryClient = useQueryClient();

  return useQuery<StoryWithComments, Error>({
    queryKey: ["story", id],
    queryFn: async () => {
      // Fetch story metadata from HN API (real-time score, always up-to-date)
      // and comments from Algolia (nested tree structure)
      const [hnItem, algoliaData] = await Promise.all([
        getItem(id),
        getStoryWithComments(id),
      ]);

      // Step 1: Use only top-level HN kids for filtering
      // We trust Algolia's nested structure to avoid slow recursive fetching
      const topLevelHNKids = hnItem.kids || [];

      // Step 2: Filter Algolia comments to only include those in HN's top-level kids array
      // This catches deleted top-level comments while trusting Algolia for nested structure
      const filteredAlgoliaComments =
        topLevelHNKids.length > 0
          ? filterAlgoliaCommentsByHNKids(algoliaData.children, topLevelHNKids)
          : [];

      // Step 3: Convert filtered Algolia comments to our format
      const convertedComments = filteredAlgoliaComments
        .map(convertAlgoliaComment)
        .filter((c): c is Comment => c !== null);

      // Step 4: Detect missing comments by comparing HN API kids vs filtered Algolia IDs
      let missingComments: Comment[] = [];

      if (hnItem.kids && hnItem.kids.length > 0) {
        // Collect all comment IDs that Algolia has (including nested) after filtering
        const algoliaCommentIds = collectAlgoliaCommentIds(
          filteredAlgoliaComments
        );

        // Find top-level comments that are in HN API but not in filtered Algolia
        const missingCommentIds = hnItem.kids.filter(
          (kidId) => !algoliaCommentIds.has(kidId)
        );

        if (missingCommentIds.length > 0) {
          // Fetch missing comments from HN API
          const missingHNItems = await getItems(missingCommentIds);

          missingComments = missingHNItems
            .map(convertHNItemToComment)
            .filter((c): c is Comment => c !== null);
        }
      }

      // Merge Algolia comments with missing HN API comments
      const allComments = [...convertedComments, ...missingComments];

      const story: StoryWithComments = {
        id: hnItem.id,
        title: hnItem.title!,
        url: hnItem.url,
        text: hnItem.text,
        by: hnItem.by!,
        time: hnItem.time ?? 0,
        score: hnItem.score ?? 0, // Use real-time score from HN API
        descendants: hnItem.descendants,
        comments: allComments,
      };

      // Keep the feed/list caches and per-item cache in sync with the live data
      syncStoryIntoCaches(queryClient, hnItem);

      return story;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes - matches global config
    refetchOnWindowFocus: true, // Refresh when returning to the app
  });
}
