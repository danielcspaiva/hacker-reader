import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";

import { useHeaderOverlapInset } from "@/components/navigation/large-title-stack";
import { CommentItem } from "@/components/story/comment-item";
import { NextNewCommentButton } from "@/components/story/next-new-comment-button";
import {
  StoryCommentInput,
  type Composer,
} from "@/components/story/story-comment-input";
import { StoryHeader } from "@/components/story/story-header";
import { StoryToolbar } from "@/components/story/story-toolbar";
import {
  EmptyState,
  ThemedRefreshControl,
  useScreenBottomInset,
} from "@/components/ui";
import { useHNAuth } from "@/contexts/hn-auth-context";
import { useAnalytics } from "@/hooks/use-analytics";
import { useBlockedUsers } from "@/hooks/use-blocked-users";
import { useCommentActions } from "@/hooks/use-comment-actions";
import {
  scrollToCommentRow,
  useScrollToComment,
} from "@/hooks/use-scroll-to-comment";
import { useStoryActions } from "@/hooks/use-story-actions";
import { useStoryVisit } from "@/hooks/use-story-visit";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import { hapticImpact } from "@/lib/haptics";
import {
  flattenComments,
  isNewComment,
  type Comment,
  type FlatComment,
  type StoryWithComments,
} from "@/lib/hn";

interface StoryDetailProps {
  story: StoryWithComments;
  /** A comment to scroll to and highlight (deep link). */
  commentId?: string;
  /** Inside a peek preview: no header toolbar, no view tracking. */
  isInsidePreview: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

/** A loaded story: header, the comment thread and the comment box. */
export function StoryDetail({
  story,
  commentId,
  isInsidePreview,
  onRefresh,
  isRefreshing,
}: StoryDetailProps) {
  const listRef = useRef<FlashListRef<FlatComment>>(null);
  const headerInset = useHeaderOverlapInset();
  const bottomInset = useScreenBottomInset();
  const analytics = useAnalytics();
  const { isAuthenticated } = useHNAuth();
  const { isBlocked } = useBlockedUsers();
  const actions = useStoryActions(story);
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());
  // Story title shows in the nav bar once the hero title scrolls under it.
  const titleBottom = useRef(Infinity);
  const [titleInHeader, setTitleInHeader] = useState(false);
  const previousVisit = useStoryVisit(story, isInsidePreview);
  const lastNewCommentId = useRef<number | null>(null);
  const [composer, setComposer] = useState<Composer | null>(null);
  const openCommentActions = useCommentActions({
    storyId: story.id,
    onReply: (replyTo) => setComposer({ replyTo }),
  });

  useEffect(() => {
    if (isInsidePreview) return;
    analytics.track(AnalyticsEvent.STORY_VIEWED, {
      [AnalyticsProperty.STORY_ID]: story.id,
      [AnalyticsProperty.STORY_TITLE]: story.title,
      [AnalyticsProperty.STORY_SCORE]: story.score,
      [AnalyticsProperty.HAS_URL]: !!story.url,
      [AnalyticsProperty.COMMENT_COUNT]: story.descendants || 0,
    });
  }, [story, isInsidePreview, analytics]);

  // Deleted/dead comments have no text: drop the row but keep its replies.
  const flatComments = flattenComments(story.comments, 0, collapsedIds).filter(
    (item) => !!item.comment.text && !isBlocked(item.comment.by)
  );

  const highlightedId = useScrollToComment({
    listRef,
    commentId,
    index: commentId
      ? flatComments.findIndex((item) => item.comment.id === Number(commentId))
      : -1,
    topOffset: headerInset + 8,
  });

  const newRowIndexes = flatComments.flatMap((item, index) =>
    isNewComment(item.comment.id, previousVisit) ? [index] : []
  );

  const scrollToNextNewComment = () => {
    // The next new comment below the last one jumped to, wrapping round.
    const lastIndex = flatComments.findIndex(
      (item) => item.comment.id === lastNewCommentId.current
    );
    const nextIndex =
      newRowIndexes.find((index) => index > lastIndex) ?? newRowIndexes[0];
    lastNewCommentId.current = flatComments[nextIndex].comment.id;
    analytics.track(AnalyticsEvent.NEXT_NEW_COMMENT_TAPPED, {
      [AnalyticsProperty.STORY_ID]: story.id,
      [AnalyticsProperty.NEW_COMMENT_COUNT]: newRowIndexes.length,
    });
    scrollToCommentRow(listRef, nextIndex, headerInset + 8);
  };

  const toggleCollapse = (comment: Comment) => {
    if (!collapsedIds.has(comment.id)) {
      analytics.track(AnalyticsEvent.COMMENT_COLLAPSED, {
        [AnalyticsProperty.COMMENT_ID]: comment.id,
        [AnalyticsProperty.CHILD_COUNT]: comment.children?.length || 0,
      });
    }
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (!next.delete(comment.id)) next.add(comment.id);
      return next;
    });
  };

  return (
    <>
      {isInsidePreview ? null : (
        <>
          <Stack.Screen
            options={{ title: titleInHeader ? (story.title ?? "") : "" }}
          />
          <StoryToolbar story={story} actions={actions} />
        </>
      )}
      <FlashList
        ref={listRef}
        data={flatComments}
        renderItem={({ item }) => (
          <CommentItem
            comment={item.comment}
            depth={item.depth}
            replyCount={item.replyCount}
            isCollapsed={collapsedIds.has(item.comment.id)}
            isOP={!!story.by && item.comment.by === story.by}
            isNew={isNewComment(item.comment.id, previousVisit)}
            isHighlighted={highlightedId === item.comment.id}
            onToggleCollapse={toggleCollapse}
            onOpenActions={openCommentActions}
          />
        )}
        keyExtractor={(item) => item.comment.id.toString()}
        ListHeaderComponent={
          <StoryHeader
            story={story}
            hasVoted={actions.hasVoted}
            onVote={actions.handleVote}
            onTitleBottomChange={(bottom) => {
              titleBottom.current = bottom;
            }}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="comments"
            title="No comments yet"
            message="Be the first to reply."
            fill={false}
          />
        }
        contentInsetAdjustmentBehavior="automatic"
        scrollEventThrottle={16}
        onScroll={(e) => {
          if (isInsidePreview) return;
          // contentOffset.y is negative by the inset while adjusted, so the
          // title is under the bar once y passes its bottom edge minus that.
          const y = e.nativeEvent.contentOffset.y;
          const past = y + headerInset > titleBottom.current;
          if (past !== titleInHeader) setTitleInHeader(past);
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <ThemedRefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              if (!isRefreshing) {
                hapticImpact();
                onRefresh();
              }
            }}
          />
        }
        contentContainerStyle={{
          paddingBottom: bottomInset + (isAuthenticated ? 72 : 0),
        }}
      />

      {!isInsidePreview && newRowIndexes.length > 0 ? (
        <NextNewCommentButton
          count={newRowIndexes.length}
          onPress={scrollToNextNewComment}
        />
      ) : null}

      <StoryCommentInput
        storyId={story.id}
        composer={composer}
        onOpen={() => setComposer({ replyTo: null })}
        onClose={() => setComposer(null)}
      />
    </>
  );
}
