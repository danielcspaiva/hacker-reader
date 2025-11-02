import { useHNAuth } from "@/contexts/hn-auth-context";
import { useBookmarkMutation } from "@/hooks/use-bookmarks";
import { useShareStory } from "@/hooks/use-share-story";
import { useAnalytics } from "@/hooks/use-analytics";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import { isAuthError, unvote, vote, type HNItem } from "@/lib/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert } from "react-native";

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

  // Vote mutation with optimistic updates
  const voteMutation = useMutation<
    void,
    unknown,
    boolean,
    { previousHasVoted: boolean; previousItem?: HNItem }
  >({
    mutationFn: async (wasVoted: boolean) => {
      if (!isAuthenticated || !session) {
        throw new Error("Not authenticated");
      }
      return wasVoted ? unvote(story.id, session) : vote(story.id, session);
    },

    onMutate: async (wasVoted) => {
      const newHasVoted = !wasVoted;
      const previousItem = queryClient.getQueryData<HNItem>(["item", story.id]);

      // Optimistic update
      setHasVoted(newHasVoted);

      if (previousItem) {
        queryClient.setQueryData(["item", story.id], {
          ...previousItem,
          score: (previousItem.score ?? 0) + (newHasVoted ? 1 : -1),
        });
      }

      return { previousHasVoted: wasVoted, previousItem };
    },

    onError: (error, _variables, context) => {
      // Rollback optimistic update
      setHasVoted(context?.previousHasVoted ?? false);

      if (context?.previousItem) {
        queryClient.setQueryData(["item", story.id], context.previousItem);
      }

      // Show appropriate error message
      if (isAuthError(error)) {
        if (error.code === "NOT_LOGGED_IN") {
          logout();
          Alert.alert("Session Expired", "Please log in again to continue", [
            { text: "OK" },
          ]);
        } else if (error.code === "RATE_LIMITED") {
          Alert.alert(
            "Slow Down",
            "You're performing actions too quickly. Please wait a moment.",
            [{ text: "OK" }]
          );
        }
      } else {
        Alert.alert("Error", "Failed to vote. Please try again.", [
          { text: "OK" },
        ]);
      }
    },

    onSuccess: (_data, wasVoted) => {
      // Track vote analytics
      if (wasVoted) {
        analytics.track(AnalyticsEvent.STORY_UNVOTED, {
          [AnalyticsProperty.STORY_ID]: story.id,
        });
      } else {
        analytics.track(AnalyticsEvent.STORY_UPVOTED, {
          [AnalyticsProperty.STORY_ID]: story.id,
        });
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["item", story.id] });
    },
  });

  const handleVote = () => {
    if (!isAuthenticated) {
      Alert.alert(
        "Login Required",
        "Please login to Hacker News in Settings to vote on stories.",
        [{ text: "OK" }]
      );
      return;
    }

    voteMutation.mutate(hasVoted);
  };

  const handleBookmark = (isBookmarked: boolean) => {
    bookmarkMutation.mutate({
      storyId: story.id,
      add: !isBookmarked,
    });

    // Track bookmark analytics
    if (isBookmarked) {
      analytics.track(AnalyticsEvent.BOOKMARK_REMOVED, {
        [AnalyticsProperty.STORY_ID]: story.id,
      });
    } else {
      analytics.track(AnalyticsEvent.STORY_BOOKMARKED, {
        [AnalyticsProperty.STORY_ID]: story.id,
      });
    }
  };

  const handleShare = () => {
    shareStory(story);

    // Track share analytics
    analytics.track(AnalyticsEvent.STORY_SHARED, {
      [AnalyticsProperty.STORY_ID]: story.id,
      [AnalyticsProperty.SHARE_METHOD]: "native",
    });
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
