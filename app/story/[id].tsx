import { CommentItem } from "@/components/story/comment-item";
import { StoryHeader } from "@/components/story/story-header";
import { ThemedText } from "@/components/themed-text";
import { useStory } from "@/hooks/use-story";
import { useThemeColor } from "@/hooks/use-theme-color";
import { flattenComments } from "@/lib/utils/comments";
import { FlashList } from "@shopify/flash-list";
import { Stack, useIsPreview, useLocalSearchParams } from "expo-router";
import { useState } from "react";
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
  const { data: story, isLoading } = useStory(Number(id));

  const textColor = useThemeColor({}, "text");
  
  const isInsidePreview = useIsPreview();

  const regularBackgroundColor = useThemeColor({}, "background");

  const previewBackgroundColor = useThemeColor({}, "previewBackground");
  
  const { bottom } = useSafeAreaInsets();

  const backgroundColor = isInsidePreview ? previewBackgroundColor : regularBackgroundColor;

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

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor }]}>
        <ActivityIndicator size="large" color={textColor} />
      </View>
    );
  }

  if (!story) {
    return (
      <View style={[styles.centered, { backgroundColor }]}>
        <ThemedText>Story not found</ThemedText>
      </View>
    );
  }

  return (
    <>
      {!isInsidePreview && (
        <Stack.Screen
          options={{ title: (title as string) || story?.title || "" }}
        />
      )}
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
});
