import { CommentItem } from "@/components/story/comment-item";
import { StoryHeader } from "@/components/story/story-header";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useBookmarkMutation, useIsBookmarked } from "@/hooks/use-bookmarks";
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
  Share,
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
  const { data: story, isLoading } = useStory(Number(id));

  const textColor = useThemeColor({}, "text");

  const isInsidePreview = useIsPreview();

  const regularBackgroundColor = useThemeColor({}, "background");

  const previewBackgroundColor = useThemeColor({}, "previewBackground");

  const { bottom } = useSafeAreaInsets();

  const backgroundColor = isInsidePreview
    ? previewBackgroundColor
    : regularBackgroundColor;

  // Bookmark state and mutation
  const { data: isBookmarked } = useIsBookmarked(Number(id));
  const bookmarkMutation = useBookmarkMutation();

  const handleShare = async () => {
    if (!story) return;

    try {
      const url =
        story.url || `https://news.ycombinator.com/item?id=${story.id}`;
      await Share.share({
        message: Platform.OS === "ios" ? story.title : `${story.title}\n${url}`,
        url: Platform.OS === "ios" ? url : undefined,
        title: story.title,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleBookmark = () => {
    bookmarkMutation.mutate({
      storyId: Number(id),
      add: !isBookmarked,
    });
  };

  // Centralized collapse state
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());

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

  // Render Stack.Screen immediately to prevent header title flash
  const screenOptions = !isInsidePreview && (
    <Stack.Screen
      options={{
        title: (title as string) || story?.title || "",
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
            <Pressable onPress={handleShare} style={styles.shareButton}>
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
        <View style={[styles.centered, { backgroundColor }]}>
          <ActivityIndicator size="large" color={textColor} />
        </View>
      </>
    );
  }

  if (!story) {
    return (
      <>
        {screenOptions}
        <View style={[styles.centered, { backgroundColor }]}>
          <ThemedText>Story not found</ThemedText>
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
        contentContainerStyle={{
          paddingBottom: Platform.select({
            android: 100 + bottom,
            default: 0,
          }),
          backgroundColor,
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
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
