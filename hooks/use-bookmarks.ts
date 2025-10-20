import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addBookmark, getBookmarkIds, isBookmarked, removeBookmark } from '@/lib/bookmarks';
import { getItem, HNItem } from '@/lib/hn-api';
import * as Haptics from 'expo-haptics';

/**
 * Hook to get all bookmarked story IDs
 */
export function useBookmarkIds() {
  return useQuery<number[], Error>({
    queryKey: ['bookmarks'],
    queryFn: getBookmarkIds,
    staleTime: 0, // Always fresh - we want to see updates immediately
  });
}

/**
 * Hook to get all bookmarked stories with full data
 */
export function useBookmarks() {
  const queryClient = useQueryClient();

  return useQuery<HNItem[], Error>({
    queryKey: ['bookmarks', 'stories'],
    queryFn: async () => {
      const ids = await getBookmarkIds();

      // Fetch stories in parallel, trying cache first
      const stories = await Promise.all(
        ids.map(async (id) => {
          // Try to get from cache first
          const cached = queryClient.getQueryData<HNItem>(['item', id]);
          if (cached) return cached;

          // Fetch from API if not cached
          const item = await getItem(id);
          // Update cache for future use
          queryClient.setQueryData(['item', id], item);
          return item;
        })
      );

      // Filter out any null/undefined items (deleted stories)
      return stories.filter(Boolean);
    },
    staleTime: 0, // Always fresh
  });
}

/**
 * Hook to check if a specific story is bookmarked
 */
export function useIsBookmarked(storyId: number) {
  return useQuery<boolean, Error>({
    queryKey: ['bookmark', 'check', storyId],
    queryFn: () => isBookmarked(storyId),
    staleTime: 0,
  });
}

/**
 * Hook to add/remove bookmarks with optimistic updates
 */
export function useBookmarkMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ storyId, add }: { storyId: number; add: boolean }) => {
      if (add) {
        await addBookmark(storyId);
      } else {
        await removeBookmark(storyId);
      }
    },
    onMutate: async ({ storyId, add }) => {
      // Haptic feedback for instant user feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['bookmarks'] });
      await queryClient.cancelQueries({ queryKey: ['bookmark', 'check', storyId] });

      // Snapshot previous values
      const previousIds = queryClient.getQueryData<number[]>(['bookmarks']);
      const previousCheck = queryClient.getQueryData<boolean>(['bookmark', 'check', storyId]);

      // Optimistically update bookmark check
      queryClient.setQueryData(['bookmark', 'check', storyId], add);

      // Optimistically update bookmark IDs list
      if (add) {
        queryClient.setQueryData<number[]>(['bookmarks'], (old = []) => [storyId, ...old]);
      } else {
        queryClient.setQueryData<number[]>(['bookmarks'], (old = []) =>
          old.filter(id => id !== storyId)
        );
      }

      return { previousIds, previousCheck };
    },
    onError: (err, { storyId }, context) => {
      // Rollback on error
      if (context?.previousIds) {
        queryClient.setQueryData(['bookmarks'], context.previousIds);
      }
      if (context?.previousCheck !== undefined) {
        queryClient.setQueryData(['bookmark', 'check', storyId], context.previousCheck);
      }
      console.error('Bookmark mutation error:', err);
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });
}
