import { CommentItem } from "@/components/story/comment-item";
import { StoryCommentInput } from "@/components/story/story-comment-input";
import { StoryHeader } from "@/components/story/story-header";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { EVENTS, EVENT_PROPERTIES } from "@/constants/analytics-events";
import { useAnalytics } from "@/hooks/use-analytics";
import { useBookmarkMutation, useIsBookmarked } from "@/hooks/use-bookmarks";
import { useShareStory } from "@/hooks/use-share-story";
import { useStory } from "@/hooks/use-story";
import { useThemeColor } from "@/hooks/use-theme-color";
import { flattenComments } from "@/lib/utils/comments";
import { getDomain } from "@hn/shared";
import { FlashList } from "@shopify/flash-list";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useIsPreview, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
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
  const { data: story, isLoading, refetch, isRefetching } = useStory(Number(id));

  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const analytics = useAnalytics();

  const isInsidePreview = useIsPreview();

  const { bottom } = useSafeAreaInsets();

  // Bookmark state and mutation
  const { data: isBookmarked } = useIsBookmarked(Number(id));
  const bookmarkMutation = useBookmarkMutation();
  const shareStory = useShareStory();

  // Track story opened event when story data loads
  useEffect(() => {
    if (story) {
      analytics.track(EVENTS.STORY_OPENED, {
        [EVENT_PROPERTIES.STORY_ID]: story.id,
        [EVENT_PROPERTIES.STORY_TITLE]: story.title,
        [EVENT_PROPERTIES.STORY_URL]: story.url,
        [EVENT_PROPERTIES.STORY_DOMAIN]: getDomain(story.url),
        [EVENT_PROPERTIES.STORY_SCORE]: story.score,
        [EVENT_PROPERTIES.STORY_COMMENTS_COUNT]: story.descendants,
        [EVENT_PROPERTIES.STORY_AUTHOR]: story.by,
      });
    }
  }, [story, analytics]);

  const handleBookmark = () => {
    // Track bookmark event
    if (story) {
      analytics.track(
        isBookmarked ? EVENTS.STORY_UNBOOKMARKED : EVENTS.STORY_BOOKMARKED,
        {
          [EVENT_PROPERTIES.STORY_ID]: story.id,
          [EVENT_PROPERTIES.STORY_TITLE]: story.title,
          [EVENT_PROPERTIES.SOURCE]: 'story_detail',
        }
      );
    }

    bookmarkMutation.mutate({
      storyId: Number(id),
      add: !isBookmarked,
    });
  };

  // Centralized collapse state
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());

  // Reply state
  const [replyTarget, setReplyTarget] = useState<{
    commentId: number;
    username: string;
  } | null>(null);

  // Flatten comments when story or collapse state changes
  const flatComments = !story?.comments
    ? []
    : flattenComments(story.comments, 0, collapsedIds);

  const toggleCollapse = (commentId: number) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      const isCollapsing = !next.has(commentId);

      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }

      // Track collapse/expand event
      analytics.track(
        isCollapsing ? EVENTS.COMMENT_COLLAPSED : EVENTS.COMMENT_VIEWED,
        {
          [EVENT_PROPERTIES.COMMENT_ID]: commentId,
          [EVENT_PROPERTIES.STORY_ID]: Number(id),
        }
      );

      return next;
    });
  };

  const handleReply = (commentId: number, username: string) => {
    // Track reply started event
    analytics.track(EVENTS.COMMENT_REPLY_STARTED, {
      [EVENT_PROPERTIES.COMMENT_ID]: commentId,
      [EVENT_PROPERTIES.COMMENT_AUTHOR]: username,
      [EVENT_PROPERTIES.STORY_ID]: Number(id),
    });

    setReplyTarget({ commentId, username });
  };

  const handleCancelReply = () => {
    setReplyTarget(null);
  };

  // Render Stack.Screen immediately to prevent header title flash
  const screenOptions = !isInsidePreview && (
    <Stack.Screen
      options={{
        title: title as string,
        headerBlurEffect: isLiquidGlassAvailable() ? "none" : "systemMaterial",
        headerRight: () => (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable onPress={handleBookmark} style={styles.shareButton}>
              <IconSymbol
                name={isBookmarked ? "bookmark.fill" : "bookmark"}
                size={22}
                color={textColor}
                weight={"medium"}
              />
            </Pressable>
            <Pressable
              onPress={() => story && shareStory(story)}
              disabled={!story}
              style={styles.shareButton}
            >
              <IconSymbol
                name="square.and.arrow.up"
                size={22}
                color={textColor}
                weight={"medium"}
              />
            </Pressable>
          </View>
        ),
      }}
    />
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
      <View style={styles.container}>
        <FlashList
          data={flatComments}
          renderItem={({ item }) => (
            <CommentItem
              comment={item.comment}
              depth={item.depth}
              isCollapsed={collapsedIds.has(item.comment.id)}
              onToggleCollapse={toggleCollapse}
              onReply={handleReply}
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
      </View>
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
  shareButton: {
    height: 36,
    width: 36,
    justifyContent: "center",
    alignItems: "center",
  },
});
