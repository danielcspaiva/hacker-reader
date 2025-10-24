import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getStoryWithComments, AlgoliaStory, AlgoliaComment } from '@/lib/algolia-api';

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

function convertAlgoliaStory(algoliaStory: AlgoliaStory): StoryWithComments {
  return {
    id: algoliaStory.id,
    title: algoliaStory.title,
    url: algoliaStory.url || undefined,
    text: algoliaStory.text || undefined,
    by: algoliaStory.author,
    time: algoliaStory.created_at_i,
    score: algoliaStory.points,
    descendants: countComments(algoliaStory.children),
    comments: algoliaStory.children
      .map(convertAlgoliaComment)
      .filter((c): c is Comment => c !== null),
  };
}

function countComments(comments: AlgoliaComment[]): number {
  return comments.reduce((total, comment) => {
    return total + 1 + countComments(comment.children);
  }, 0);
}

export function useStory(id: number) {
  const queryClient = useQueryClient();

  return useQuery<StoryWithComments, Error>({
    queryKey: ['story', id],
    queryFn: async () => {
      const algoliaStory = await getStoryWithComments(id);
      const story = convertAlgoliaStory(algoliaStory);

      // Update the story data in all infinite query caches (top, new, ask, show, jobs)
      const categories = ['top', 'new', 'ask', 'show', 'jobs'] as const;

      categories.forEach((category) => {
        queryClient.setQueriesData(
          { queryKey: ['stories', category] },
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
      queryClient.setQueryData(['item', id], {
        id: story.id,
        title: story.title,
        url: story.url,
        by: story.by,
        time: story.time,
        score: story.score,
        descendants: story.descendants,
        type: 'story' as const,
      });

      return story;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes - matches global config
    refetchOnWindowFocus: true, // Refresh when returning to the app
  });
}
