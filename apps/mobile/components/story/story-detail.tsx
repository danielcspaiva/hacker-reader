import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { useEffect, useRef, useState } from "react";

import { useHeaderOverlapInset } from "@/components/navigation/large-title-stack";
import { CommentItem } from "@/components/story/comment-item";
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
import { useScrollToComment } from "@/hooks/use-scroll-to-comment";
import { useStoryActions } from "@/hooks/use-story-actions";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import { hapticImpact } from "@/lib/haptics";
import {
  flattenComments,
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
        <StoryToolbar story={story} actions={actions} />
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

      <StoryCommentInput
        storyId={story.id}
        composer={composer}
        onOpen={() => setComposer({ replyTo: null })}
        onClose={() => setComposer(null)}
      />
    </>
  );
}
