import { useHNAuth } from "@/contexts/hn-auth-context";
import { useBookmarkMutation, useIsBookmarked } from "@/hooks/use-bookmarks";
import { useShareStory } from "@/hooks/use-share-story";
import { useHiddenStories } from "@/hooks/use-hidden-items";
import { useAnalytics } from "@/hooks/use-analytics";
import { useHasVoted, addVote, removeVote } from "@/hooks/use-votes";
import { useBlockedUsers } from "@/hooks/use-blocked-users";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import { isAuthError, unvote, vote, flag, type HNItem } from "@/lib/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

export interface StoryActions {
  // State
  hasVoted: boolean;
  isVoting: boolean;
  isBookmarking: boolean;
  isHidden: boolean;
  isBookmarked: boolean;
  isBlocked: boolean;

  // Actions
  handleVote: () => void;
  handleBookmark: (isBookmarked?: boolean) => void;
  handleShare: () => void;
  handleHide: () => void;
  handleFlag: () => void;
  handleBlockUser: () => void;
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
  const { isHidden, hideItem } = useHiddenStories();
  const { blockUser, isBlocked: isUserBlocked } = useBlockedUsers();
  const analytics = useAnalytics();
  const hasVoted = useHasVoted(story.id);
  const { data: isBookmarked = false } = useIsBookmarked(story.id);
  const isBlocked = story.by ? isUserBlocked(story.by) : false;

  // Vote mutation with persistent vote tracking
  const voteMutation = useMutation<
    void,
    unknown,
    boolean,
    { previousVotes?: number[] }
  >({
    mutationFn: async (wasVoted: boolean) => {
      if (!isAuthenticated || !session) {
        throw new Error("Not authenticated");
      }

      // Update HN API
      const result = await (wasVoted
        ? unvote(story.id, session)
        : vote(story.id, session));

      // Update local vote storage
      if (wasVoted) {
        await removeVote(story.id);
      } else {
        await addVote(story.id);
      }

      return result;
    },

    onMutate: async (wasVoted) => {
      // Optimistically update the votes cache
      await queryClient.cancelQueries({ queryKey: ["votes"] });
      const previousVotes = queryClient.getQueryData<number[]>(["votes"]);

      if (wasVoted) {
        // Remove from votes
        queryClient.setQueryData<number[]>(["votes"], (old = []) =>
          old.filter((id) => id !== story.id)
        );
      } else {
        // Add to votes
        queryClient.setQueryData<number[]>(["votes"], (old = []) => [
          ...old,
          story.id,
        ]);
      }

      return { previousVotes };
    },

    onError: (error, _wasVoted, context) => {
      console.error("[useStoryActions] Vote mutation error:", {
        storyId: story.id,
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        isAuthError: isAuthError(error),
        errorCode: isAuthError(error) ? error.code : "N/A",
      });

      // Rollback optimistic update
      if (context?.previousVotes) {
        queryClient.setQueryData(["votes"], context.previousVotes);
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

  const handleBookmark = (currentBookmarkState?: boolean) => {
    // If no parameter provided, use the current bookmarked state from the hook
    const bookmarkState = currentBookmarkState ?? isBookmarked;

    bookmarkMutation.mutate({
      storyId: story.id,
      add: !bookmarkState,
    });

    // Track bookmark analytics
    if (bookmarkState) {
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

  const handleHide = () => {
    Alert.alert("Hide Story", "This story will be hidden from your feed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Hide",
        style: "destructive",
        onPress: () => {
          hideItem(story.id);
          // Track hide analytics
          analytics.track(AnalyticsEvent.STORY_HIDDEN, {
            [AnalyticsProperty.STORY_ID]: story.id,
          });
        },
      },
    ]);
  };

  // Flag mutation
  const flagMutation = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated || !session) {
        throw new Error("Not authenticated");
      }
      return flag(story.id, session);
    },

    onSuccess: () => {
      Alert.alert(
        "Content Flagged",
        "This content has been reported to Hacker News moderators.",
        [{ text: "OK" }]
      );

      // Track flag analytics
      analytics.track(AnalyticsEvent.STORY_FLAGGED, {
        [AnalyticsProperty.STORY_ID]: story.id,
      });
    },

    onError: (error) => {
      if (isAuthError(error)) {
        if (error.code === "NOT_LOGGED_IN") {
          logout();
          Alert.alert("Session Expired", "Please log in again to continue", [
            { text: "OK" },
          ]);
        } else if (error.code === "INSUFFICIENT_KARMA") {
          Alert.alert(
            "Insufficient Karma",
            "You need more karma on Hacker News to flag content.",
            [{ text: "OK" }]
          );
        } else {
          Alert.alert("Error", "Failed to flag content. Please try again.", [
            { text: "OK" },
          ]);
        }
      } else {
        Alert.alert("Error", "Failed to flag content. Please try again.", [
          { text: "OK" },
        ]);
      }
    },
  });

  const handleFlag = () => {
    if (!isAuthenticated) {
      Alert.alert(
        "Login Required",
        "Please login to Hacker News in Settings to flag inappropriate content.",
        [{ text: "OK" }]
      );
      return;
    }

    Alert.alert("Flag Content", "Report this story as inappropriate?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Flag",
        style: "destructive",
        onPress: () => flagMutation.mutate(),
      },
    ]);
  };

  const handleBlockUser = () => {
    const username = story.by;
    if (!username) {
      Alert.alert("Error", "Cannot block this user.", [{ text: "OK" }]);
      return;
    }

    Alert.alert(
      "Block User",
      `Block all content from ${username}? This will hide their stories and comments from your feed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              await blockUser(username);
              Alert.alert(
                "User Blocked",
                `You will no longer see content from ${username}. You can unblock them in Settings.`,
                [{ text: "OK" }]
              );
              // Note: No need to invalidate stories query here
              // The feed screen will automatically re-filter stories
              // when the blocked users query updates
            } catch (error) {
              console.error("[useStoryActions] Failed to block user:", error);
              Alert.alert("Error", "Failed to block user. Please try again.", [
                { text: "OK" },
              ]);
            }
          },
        },
      ]
    );
  };

  return {
    hasVoted,
    isVoting: voteMutation.isPending,
    isBookmarking: bookmarkMutation.isPending,
    isHidden: isHidden(story.id),
    isBookmarked,
    isBlocked,
    handleVote,
    handleBookmark,
    handleShare,
    handleHide,
    handleFlag,
    handleBlockUser,
  };
}
