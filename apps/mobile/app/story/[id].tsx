import { CommentItem } from "@/components/story/comment-item";
import { StoryCommentInput } from "@/components/story/story-comment-input";
import { StoryHeader } from "@/components/story/story-header";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useBookmarkMutation, useIsBookmarked } from "@/hooks/use-bookmarks";
import { useShareStory } from "@/hooks/use-share-story";
import { useStory } from "@/hooks/use-story";
import { useThemeColor } from "@/hooks/use-theme-color";
import { flattenComments } from "@/lib/utils/comments";
import { FlashList } from "@shopify/flash-list";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useIsPreview, useLocalSearchParams } from "expo-router";
import { useState } from "react";
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

  // Bookmark state and mutation
  const { data: isBookmarked } = useIsBookmarked(Number(id));
  const bookmarkMutation = useBookmarkMutation();
  const shareStory = useShareStory();

  const handleBookmark = () => {
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
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
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
  shareButton: {
    height: 36,
    width: 36,
    justifyContent: "center",
    alignItems: "center",
  },
});
