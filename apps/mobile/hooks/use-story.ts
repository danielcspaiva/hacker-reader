import { getItem } from "@/lib/shared";
import {
  getStoryWithComments,
  type AlgoliaComment,
} from "@/lib/shared/api/algolia-api";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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

// Convert Algolia format to our app's format
function convertAlgoliaComment(algoliaComment: AlgoliaComment): Comment | null {
  // Skip deleted or invalid comments
  if (!algoliaComment.author || !algoliaComment.text) {
    return null;
  }

  return {
    id: algoliaComment.id,
    by: algoliaComment.author,
    time: algoliaComment.created_at_i,
    text: algoliaComment.text,
    children: algoliaComment.children
      .map(convertAlgoliaComment)
      .filter((c): c is Comment => c !== null),
  };
}

export function useStory(id: number) {
  const queryClient = useQueryClient();

  return useQuery<StoryWithComments, Error>({
    queryKey: ["story", id],
    queryFn: async () => {
      console.log(`[useStory] Fetching story ${id}`);

      // Fetch story metadata from HN API (real-time score, always up-to-date)
      // and comments from Algolia (nested tree structure)
      const [hnItem, algoliaData] = await Promise.all([
        getItem(id),
        getStoryWithComments(id),
      ]);

      console.log(
        `[useStory] HN API score: ${hnItem.score}, Algolia score: ${algoliaData.points}`
      );

      // Build story with real-time HN data + Algolia comments
      const story: StoryWithComments = {
        id: hnItem.id,
        title: hnItem.title!,
        url: hnItem.url,
        text: hnItem.text,
        by: hnItem.by!,
        time: hnItem.time ?? 0,
        score: hnItem.score ?? 0, // Use real-time score from HN API
        descendants: hnItem.descendants,
        comments: algoliaData.children
          .map(convertAlgoliaComment)
          .filter((c): c is Comment => c !== null),
      };

      // Update the story data in all infinite query caches (top, new, ask, show, jobs)
      const categories = ["top", "new", "ask", "show", "jobs"] as const;

      categories.forEach((category) => {
        queryClient.setQueriesData(
          { queryKey: ["stories", category] },
          (oldData: any) => {
            if (!oldData?.pages) return oldData;

            return {
              ...oldData,
              pages: oldData.pages.map((page: any[]) =>
                page.map((item: any) =>
                  item.id === id
                    ? {
                        ...item,
                        descendants: story.descendants,
                        score: story.score,
                        title: story.title,
                      }
                    : item
                )
              ),
            };
          }
        );
      });

      // Also update the individual item cache
      queryClient.setQueryData(["item", id], hnItem);

      return story;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes - matches global config
    refetchOnWindowFocus: true, // Refresh when returning to the app
  });
}
