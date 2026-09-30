import { Alert } from "react-native";

import { useHNAuth } from "@/contexts/hn-auth-context";
import { useAnalytics } from "@/hooks/use-analytics";
import { useBlockUserWithFeedback } from "@/hooks/use-block-user";
import { useBookmarkMutation, useIsBookmarked } from "@/hooks/use-bookmarks";
import { useFlagStory } from "@/hooks/use-flag-story";
import { useHiddenStories } from "@/hooks/use-hidden-items";
import { useReadEntry, useReadStories } from "@/hooks/use-read-stories";
import { useShareStory } from "@/hooks/use-share-story";
import { useHasVoted, useToggleVote } from "@/hooks/use-votes";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import { confirmDestructive } from "@/lib/confirm-destructive";
import { hapticImpact } from "@/lib/haptics";
import type { HNItem, ReadStoryEntry } from "@/lib/hn";

export interface StoryActions {
  hasVoted: boolean;
  isBookmarked: boolean;
  /** Your last visit (or manual mark), undefined while the story is unread. */
  readEntry: ReadStoryEntry | undefined;

  handleVote: () => void;
  handleBookmark: () => void;
  handleShare: () => void;
  handleToggleRead: () => void;
  handleHide: () => void;
  handleFlag: () => void;
  handleBlockUser: () => void;
}

/**
 * Story actions (vote, bookmark, share, mark read, hide, flag, block) composed from the
 * per-action hooks, with the analytics for each.
 */
export function useStoryActions(story: HNItem): StoryActions {
  const { isAuthenticated } = useHNAuth();
  const analytics = useAnalytics();
  const bookmarkMutation = useBookmarkMutation();
  const shareStory = useShareStory();
  const { hideItem } = useHiddenStories();
  const { data: readEntry } = useReadEntry(story.id);
  const { markRead, markUnread } = useReadStories();
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

    // A second tap while a vote is in flight would race it (the local state
    // is optimistic, HN's is not yet).
    if (toggleVote.isPending) return;
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

  const handleToggleRead = () => {
    hapticImpact();
    if (readEntry) {
      markUnread(story.id);
    } else {
      markRead({ id: story.id, commentCount: story.descendants || 0 });
    }

    analytics.track(
      readEntry
        ? AnalyticsEvent.STORY_MARKED_UNREAD
        : AnalyticsEvent.STORY_MARKED_READ,
      { [AnalyticsProperty.STORY_ID]: story.id }
    );
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
    readEntry,
    handleVote,
    handleBookmark,
    handleShare,
    handleToggleRead,
    handleHide,
    handleFlag,
    handleBlockUser: () => blockUserWithFeedback(story.by),
  };
}
