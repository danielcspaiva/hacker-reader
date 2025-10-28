import { EVENTS, EVENT_PROPERTIES } from '@/constants/analytics-events';
import { useHNAuth } from '@/contexts/hn-auth-context';
import { useAnalytics } from '@/hooks/use-analytics';
import { useBookmarkMutation } from '@/hooks/use-bookmarks';
import { useShareStory } from '@/hooks/use-share-story';
import { getDomain, isAuthError, unvote, vote, type HNItem } from '@hn/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert } from 'react-native';

export interface StoryActions {
  // State
  hasVoted: boolean;
  isVoting: boolean;
  isBookmarking: boolean;

  // Actions
  handleVote: () => void;
  handleBookmark: (isBookmarked: boolean) => void;
  handleShare: () => void;
}

/**
 * Hook for story card actions (vote, bookmark, share)
 *
 * Provides all mutation logic for interacting with a story:
 * - Voting with optimistic updates and auth checks
 * - Bookmarking with optimistic updates
 * - Sharing with platform-specific formatting
 *
 * @param story - The HN story item
 * @returns Actions and state for story interactions
 *
 * @example
 * ```tsx
 * function StoryCard({ story }) {
 *   const actions = useStoryActions(story);
 *
 *   return (
 *     <View>
 *       <Button onPress={actions.handleVote}>
 *         {actions.hasVoted ? 'Upvoted' : 'Upvote'}
 *       </Button>
 *     </View>
 *   );
 * }
 * ```
 */
export function useStoryActions(story: HNItem): StoryActions {
  const queryClient = useQueryClient();
  const { session, isAuthenticated, logout } = useHNAuth();
  const bookmarkMutation = useBookmarkMutation();
  const shareStory = useShareStory();
  const analytics = useAnalytics();
  const [hasVoted, setHasVoted] = useState(false);

  // Helper to build story event properties
  const getStoryProperties = () => ({
    [EVENT_PROPERTIES.STORY_ID]: story.id,
    [EVENT_PROPERTIES.STORY_TITLE]: story.title,
    [EVENT_PROPERTIES.STORY_URL]: story.url,
    [EVENT_PROPERTIES.STORY_DOMAIN]: getDomain(story.url),
    [EVENT_PROPERTIES.STORY_SCORE]: story.score,
    [EVENT_PROPERTIES.STORY_COMMENTS_COUNT]: story.descendants,
    [EVENT_PROPERTIES.STORY_AUTHOR]: story.by,
    [EVENT_PROPERTIES.STORY_TYPE]: story.type,
    [EVENT_PROPERTIES.HAS_URL]: Boolean(story.url),
  });

  // Vote mutation with optimistic updates
  const voteMutation = useMutation<
    void,
    unknown,
    boolean,
    { previousHasVoted: boolean; previousItem?: HNItem }
  >({
    mutationFn: async (wasVoted: boolean) => {
      if (!isAuthenticated || !session) {
        throw new Error('Not authenticated');
      }
      return wasVoted ? unvote(story.id, session) : vote(story.id, session);
    },

    onMutate: async (wasVoted) => {
      const newHasVoted = !wasVoted;
      const previousItem = queryClient.getQueryData<HNItem>(['item', story.id]);

      // Optimistic update
      setHasVoted(newHasVoted);

      if (previousItem) {
        queryClient.setQueryData(['item', story.id], {
          ...previousItem,
          score: (previousItem.score ?? 0) + (newHasVoted ? 1 : -1),
        });
      }

      return { previousHasVoted: wasVoted, previousItem };
    },

    onError: (error, wasVoted, context) => {
      // Rollback optimistic update
      setHasVoted(context?.previousHasVoted ?? false);

      if (context?.previousItem) {
        queryClient.setQueryData(['item', story.id], context.previousItem);
      }

      // Track vote failure
      analytics.track(EVENTS.VOTE_FAILED, {
        ...getStoryProperties(),
        [EVENT_PROPERTIES.ERROR_TYPE]: isAuthError(error) ? error.code : 'unknown',
        [EVENT_PROPERTIES.ERROR_MESSAGE]: error instanceof Error ? error.message : 'Unknown error',
      });

      // Show appropriate error message
      if (isAuthError(error)) {
        if (error.code === 'NOT_LOGGED_IN') {
          logout();
          Alert.alert(
            'Session Expired',
            'Please log in again to continue',
            [{ text: 'OK' }]
          );
          analytics.track(EVENTS.SESSION_EXPIRED);
        } else if (error.code === 'RATE_LIMITED') {
          Alert.alert(
            'Slow Down',
            "You're performing actions too quickly. Please wait a moment.",
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert(
          'Error',
          'Failed to vote. Please try again.',
          [{ text: 'OK' }]
        );
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['item', story.id] });
    },
  });

  const handleVote = () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Login Required',
        'Please login to Hacker News in Settings to vote on stories.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Track vote event
    const wasVoted = hasVoted;
    analytics.track(
      wasVoted ? EVENTS.STORY_UNVOTED : EVENTS.STORY_UPVOTED,
      getStoryProperties()
    );

    voteMutation.mutate(wasVoted);
  };

  const handleBookmark = (isBookmarked: boolean) => {
    // Track bookmark event
    analytics.track(
      isBookmarked ? EVENTS.STORY_UNBOOKMARKED : EVENTS.STORY_BOOKMARKED,
      getStoryProperties()
    );

    bookmarkMutation.mutate({
      storyId: story.id,
      add: !isBookmarked,
    });
  };

  const handleShare = () => {
    // Track share event
    analytics.track(EVENTS.STORY_SHARED, getStoryProperties());

    shareStory(story);
  };

  return {
    hasVoted,
    isVoting: voteMutation.isPending,
    isBookmarking: bookmarkMutation.isPending,
    handleVote,
    handleBookmark,
    handleShare,
  };
}

