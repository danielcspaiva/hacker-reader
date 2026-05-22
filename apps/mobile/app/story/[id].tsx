import { CommentItem } from "@/components/story/comment-item";
import { StoryCommentInput } from "@/components/story/story-comment-input";
import { StoryHeader } from "@/components/story/story-header";
import { ThemedText } from "@/components/themed-text";
import { useAnalytics } from "@/hooks/use-analytics";
import { useBlockedUsers } from "@/hooks/use-blocked-users";
import { useStory } from "@/hooks/use-story";
import { useStoryActions } from "@/hooks/use-story-actions";
import { useThemeColor } from "@/hooks/use-theme-color";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import { flattenComments } from "@/lib/utils/comments";
import { FlashList } from "@shopify/flash-list";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useIsPreview, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function EmptyComments() {
  return (
    <View style={styles.centered}>
      <ThemedText style={styles.noComments}>No comments yet</ThemedText>
    </View>
  );
}

export default function StoryDetailScreen() {
  const { id, title } = useLocalSearchParams();
  const analytics = useAnalytics();
  const { isBlocked } = useBlockedUsers();
  const {
    data: story,
    isLoading,
    refetch,
    isRefetching,
  } = useStory(Number(id));

  const textColor = useThemeColor({}, "text");

  const isInsidePreview = useIsPreview();
  const themeBackgroundColor = useThemeColor({}, "background");
  const previewBackgroundColor = useThemeColor({}, "previewBackground");
  const backgroundColor = isInsidePreview
    ? previewBackgroundColor
    : themeBackgroundColor;

  const { bottom } = useSafeAreaInsets();

  // Story actions hook - use placeholder story when not loaded yet
  const placeholderStory = {
    id: Number(id),
    type: "story" as const,
    by: "",
    time: 0,
    title: "",
    score: 0,
  };
  const {
    isBookmarked,
    hasVoted,
    handleBookmark,
    handleShare,
    handleHide,
    handleVote,
    handleFlag,
    handleBlockUser,
  } = useStoryActions(story || placeholderStory);

  // Track story viewed
  useEffect(() => {
    if (story && !isLoading && !isInsidePreview) {
      analytics.track(AnalyticsEvent.STORY_VIEWED, {
        [AnalyticsProperty.STORY_ID]: story.id,
        [AnalyticsProperty.STORY_TITLE]: story.title,
        [AnalyticsProperty.STORY_SCORE]: story.score,
        [AnalyticsProperty.HAS_URL]: !!story.url,
        [AnalyticsProperty.COMMENT_COUNT]: story.descendants || 0,
      });
    }
  }, [story, isLoading, isInsidePreview, analytics]);

  // Centralized collapse state
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());

  // Reply state
  const [replyTarget, setReplyTarget] = useState<{
    commentId: number;
    username: string;
  } | null>(null);

  // Flatten comments when story or collapse state changes
  const allFlatComments = !story?.comments
    ? []
    : flattenComments(story.comments, 0, collapsedIds);

  // Filter out comments from blocked users
  const flatComments = allFlatComments.filter(
    (item) => !isBlocked(item.comment.by)
  );

  const toggleCollapse = (commentId: number) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);

      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);

        // Track comment collapse - find comment recursively in tree
        if (story?.comments) {
          const findComment = (
            comments: typeof story.comments
          ): (typeof story.comments)[0] | undefined => {
            for (const comment of comments) {
              if (comment.id === commentId) return comment;
              const found = findComment(comment.children);
              if (found) return found;
            }
            return undefined;
          };

          const comment = findComment(story.comments);
          if (comment) {
            analytics.track(AnalyticsEvent.COMMENT_COLLAPSED, {
              [AnalyticsProperty.COMMENT_ID]: commentId,
              [AnalyticsProperty.CHILD_COUNT]: comment.children?.length || 0,
            });
          }
        }
      }
      return next;
    });
  };

  const handleReply = (commentId: number, username: string) => {
    setReplyTarget({ commentId, username });
  };

  const handleCancelReply = () => {
    setReplyTarget(null);
  };

  // Render Stack.Screen immediately to prevent header title flash
  // Use fetched story title if available, otherwise fall back to route param or loading state
  const headerTitle = story?.title || (title as string) || "Story";

  // Native header items via Stack.Toolbar (expo-router): the bookmark toggle plus
  // a tap-to-open "More" menu. This replaces the previous @expo/ui ContextMenu, which
  // only opened on long-press — the wrong gesture for a header button. Stack.Toolbar is
  // cross-platform (iOS + Android) as of SDK 56.
  const screenOptions = !isInsidePreview && (
    <>
      <Stack.Screen
        options={{
          title: headerTitle,
          headerBlurEffect: isLiquidGlassAvailable()
            ? "none"
            : "systemMaterial",
        }}
      />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={isBookmarked ? "bookmark.fill" : "bookmark"}
          tintColor={textColor}
          onPress={handleBookmark}
        />
        <Stack.Toolbar.Menu icon="ellipsis" tintColor={textColor}>
          <Stack.Toolbar.MenuAction
            icon={hasVoted ? "arrow.up.circle.fill" : "arrow.up"}
            onPress={handleVote}
          >
            {hasVoted ? "Unvote" : "Upvote"}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="square.and.arrow.up"
            onPress={handleShare}
          >
            Share
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="eye.slash" onPress={handleHide}>
            Hide
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="flag" destructive onPress={handleFlag}>
            Flag
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="nosign"
            destructive
            onPress={handleBlockUser}
          >
            Block User
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
    </>
  );

  if (isLoading) {
    return (
      <>
        {screenOptions}
        <View style={[styles.container, { backgroundColor }]}>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={textColor} />
          </View>
        </View>
      </>
    );
  }

  if (!story) {
    return (
      <>
        {screenOptions}
        <View style={[styles.container, { backgroundColor }]}>
          <View style={styles.centered}>
            <ThemedText>Story not found</ThemedText>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      {screenOptions}
      <FlashList
        data={flatComments}
        renderItem={({ item }) => (
          <CommentItem
            comment={item.comment}
            depth={item.depth}
            isCollapsed={collapsedIds.has(item.comment.id)}
            onToggleCollapse={toggleCollapse}
            onReply={handleReply}
            storyId={Number(id)}
          />
        )}
        keyExtractor={(item) => item.comment.id.toString()}
        getItemType={(item) => {
          const isCollapsed = collapsedIds.has(item.comment.id);
          return `comment-depth-${item.depth}-${
            isCollapsed ? "collapsed" : "expanded"
          }`;
        }}
        ListHeaderComponent={<StoryHeader story={story} />}
        ListEmptyComponent={<EmptyComments />}
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustContentInsets={true}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onRefresh={() => {
          // Only trigger refetch if not already loading or refetching
          if (!isLoading && !isRefetching) {
            refetch();
          }
        }}
        refreshing={isRefetching}
        style={{ backgroundColor }}
        contentContainerStyle={{
          backgroundColor,
          paddingBottom: Platform.select({
            android: 100 + bottom,
            default: 0,
          }),
        }}
      />

      {/* Story Comment Input */}
      <StoryCommentInput
        storyId={Number(id)}
        replyTarget={replyTarget}
        onCancelReply={handleCancelReply}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  noComments: {
    opacity: 0.5,
  },
});
