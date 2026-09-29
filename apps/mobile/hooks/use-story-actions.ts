import { Alert } from "react-native";

import { useHNAuth } from "@/contexts/hn-auth-context";
import { useAnalytics } from "@/hooks/use-analytics";
import { useBlockUserWithFeedback } from "@/hooks/use-block-user";
import { useBookmarkMutation, useIsBookmarked } from "@/hooks/use-bookmarks";
import { useFlagStory } from "@/hooks/use-flag-story";
import { useHiddenStories } from "@/hooks/use-hidden-items";
import { useShareStory } from "@/hooks/use-share-story";
import { useHasVoted, useToggleVote } from "@/hooks/use-votes";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import { confirmDestructive } from "@/lib/confirm-destructive";
import { hapticImpact } from "@/lib/haptics";
import type { HNItem } from "@/lib/hn";

export interface StoryActions {
  hasVoted: boolean;
  isBookmarked: boolean;

  handleVote: () => void;
  handleBookmark: () => void;
  handleShare: () => void;
  handleHide: () => void;
  handleFlag: () => void;
  handleBlockUser: () => void;
}

/**
 * Story actions (vote, bookmark, share, hide, flag, block) composed from the
 * per-action hooks, with the analytics for each.
 */
export function useStoryActions(story: HNItem): StoryActions {
  const { isAuthenticated } = useHNAuth();
  const analytics = useAnalytics();
  const bookmarkMutation = useBookmarkMutation();
  const shareStory = useShareStory();
  const { hideItem } = useHiddenStories();
  const hasVoted = useHasVoted(story.id);
  const { data: isBookmarked = false } = useIsBookmarked(story.id);
  const toggleVote = useToggleVote(story.id);
  const handleFlag = useFlagStory(story.id);
  const blockUserWithFeedback = useBlockUserWithFeedback();

  const handleVote = () => {
    if (!isAuthenticated) {
      Alert.alert(
        "Sign In Required",
        "Sign in from the Profile tab to vote on stories.",
        [{ text: "OK" }]
      );
      return;
    }

    hapticImpact();
    toggleVote.mutate(hasVoted);
  };

  const handleBookmark = () => {
    bookmarkMutation.mutate({ storyId: story.id, add: !isBookmarked });

    analytics.track(
      isBookmarked
        ? AnalyticsEvent.BOOKMARK_REMOVED
        : AnalyticsEvent.STORY_BOOKMARKED,
      { [AnalyticsProperty.STORY_ID]: story.id }
    );
  };

  const handleShare = () => {
    hapticImpact();
    shareStory(story);

    analytics.track(AnalyticsEvent.STORY_SHARED, {
      [AnalyticsProperty.STORY_ID]: story.id,
      [AnalyticsProperty.SHARE_METHOD]: "native",
    });
  };

  const handleHide = () => {
    confirmDestructive({
      title: "Hide Story",
      message: "This story will be hidden from your feed.",
      confirmLabel: "Hide",
      onConfirm: () => {
        hideItem(story.id);
        analytics.track(AnalyticsEvent.STORY_HIDDEN, {
          [AnalyticsProperty.STORY_ID]: story.id,
        });
      },
    });
  };

  return {
    hasVoted,
    isBookmarked,
    handleVote,
    handleBookmark,
    handleShare,
    handleHide,
    handleFlag,
    handleBlockUser: () => blockUserWithFeedback(story.by),
  };
}
