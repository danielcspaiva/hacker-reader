import { LinkPreview } from "@/components/link-preview";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Comment as CommentType, useStory } from "@/hooks/use-story";
import { useThemeColor } from "@/hooks/use-theme-color";
import { parseHTMLWithLinks } from "@/lib/utils/html";
import { timeAgo } from "@/lib/utils/time";
import { FlashList } from "@shopify/flash-list";
import { Stack, useIsPreview, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { memo, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface FlatComment {
  comment: CommentType;
  depth: number;
}

// Flatten nested comment tree into array with depth tracking
function flattenComments(
  comments: CommentType[],
  depth: number = 0,
  collapsedIds: Set<number>
): FlatComment[] {
  const result: FlatComment[] = [];

  for (const comment of comments) {
    result.push({ comment, depth });

    // Only include children if this comment is not collapsed
    if (
      comment.children &&
      comment.children.length > 0 &&
      !collapsedIds.has(comment.id)
    ) {
      result.push(
        ...flattenComments(comment.children, depth + 1, collapsedIds)
      );
    }
  }

  return result;
}

interface CommentProps {
  comment: CommentType;
  depth: number;
  isCollapsed: boolean;
  onToggleCollapse: (id: number) => void;
}

const Comment = memo(function Comment({
  comment,
  depth,
  isCollapsed,
  onToggleCollapse,
}: CommentProps) {
  const borderColor = useThemeColor({}, "border");
  const tintColor = useThemeColor({}, "tint");

  if (!comment.text) {
    return null;
  }

  // Build the innermost comment content
  let content = (
    <View style={[styles.comment, { borderLeftColor: borderColor }]}>
      <View style={styles.commentHeader}>
        <ThemedText style={styles.commentAuthor}>{comment.by}</ThemedText>
        <ThemedText style={styles.commentTime}>
          {" "}
          • {timeAgo(comment.time)}
        </ThemedText>
        {comment.children && comment.children.length > 0 && (
          <TouchableOpacity onPress={() => onToggleCollapse(comment.id)}>
            <ThemedText style={styles.collapseButton}>
              {" "}
              [{isCollapsed ? `+${comment.children.length}` : "−"}]
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>
      {!isCollapsed && (
        <ThemedText style={styles.commentText}>
          {parseHTMLWithLinks(comment.text)?.map((part, index) => {
            if (part.type === "link") {
              return (
                <ThemedText
                  key={index}
                  style={{ color: tintColor }}
                  onPress={() =>
                    part.url && WebBrowser.openBrowserAsync(part.url)
                  }
                >
                  {part.content}
                </ThemedText>
              );
            }
            return <ThemedText key={index}>{part.content}</ThemedText>;
          })}
        </ThemedText>
      )}
    </View>
  );

  // Wrap with nested border containers for each depth level
  for (let i = depth - 1; i >= 0; i--) {
    content = (
      <View
        key={i}
        style={[styles.nestedBorder, { borderLeftColor: borderColor }]}
      >
        {content}
      </View>
    );
  }

  // Wrap ALL comments (at any depth) with horizontal padding container
  return <View style={styles.commentContainer}>{content}</View>;
});

export default function StoryDetailScreen() {
  const { id } = useLocalSearchParams();
  const { data: story, isLoading } = useStory(Number(id));
  const isPreview = useIsPreview();

  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const borderColor = useThemeColor({}, "border");

  const { top, bottom } = useSafeAreaInsets();

  // Centralized collapse state
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());

  // Flatten comments when story or collapse state changes
  const flatComments = useMemo(() => {
    if (!story?.comments) return [];
    return flattenComments(story.comments, 0, collapsedIds);
  }, [story?.comments, collapsedIds]);

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

  const openURL = async (url: string) => {
    await WebBrowser.openBrowserAsync(url);
  };

  if (isLoading) {
    return (
      <>
        {!isPreview && <Stack.Screen options={{ title: "" }} />}
        <ThemedView style={styles.centered}>
          <ActivityIndicator size="large" color={textColor} />
        </ThemedView>
      </>
    );
  }

  if (!story) {
    return (
      <>
        {!isPreview && <Stack.Screen options={{ title: "Not Found" }} />}
        <ThemedView style={styles.centered}>
          <ThemedText>Story not found</ThemedText>
        </ThemedView>
      </>
    );
  }

  const renderHeader = () => (
    <>
      <View style={[styles.header]}>
        <ThemedText style={styles.title}>{story!.title}</ThemedText>
        <View style={styles.metadata}>
          <ThemedText style={styles.metadataText}>
            {story!.score} points by {story!.by}
          </ThemedText>
          <ThemedText style={styles.metadataText}> • </ThemedText>
          <ThemedText style={styles.metadataText}>
            {timeAgo(story!.time || 0)}
          </ThemedText>
          {story!.descendants !== undefined && (
            <>
              <ThemedText style={styles.metadataText}> • </ThemedText>
              <ThemedText style={styles.metadataText}>
                {story!.descendants} comments
              </ThemedText>
            </>
          )}
        </View>
        {story!.url && (
          <>
            <TouchableOpacity onPress={() => openURL(story!.url!)}>
              <ThemedText style={[styles.url, { color: tintColor }]}>
                {story!.url}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => openURL(story!.url!)}
              accessibilityRole="link"
              activeOpacity={0.8}
            >
              <LinkPreview url={story!.url} />
            </TouchableOpacity>
          </>
        )}
        {story!.text && (
          <ThemedText style={styles.storyText}>
            {parseHTMLWithLinks(story!.text)?.map((part, index) => {
              if (part.type === "link") {
                return (
                  <ThemedText
                    key={index}
                    style={{ color: tintColor }}
                    onPress={() => part.url && openURL(part.url)}
                  >
                    {part.content}
                  </ThemedText>
                );
              }
              return <ThemedText key={index}>{part.content}</ThemedText>;
            })}
          </ThemedText>
        )}
      </View>
      <View style={styles.commentsHeader}>
        <ThemedText style={styles.commentsTitle}>
          Comments {story!.descendants ? `(${story!.descendants})` : ''}
        </ThemedText>
      </View>
    </>
  );

  const renderEmptyComponent = () => (
    <View style={styles.centered}>
      <ThemedText style={styles.noComments}>No comments yet</ThemedText>
    </View>
  );

  return (
    <>
      {!isPreview && <Stack.Screen options={{ title: "" }} />}
      <ThemedView style={styles.container}>
        <FlashList
          data={flatComments}
          renderItem={({ item }) => (
            <Comment
              comment={item.comment}
              depth={item.depth}
              isCollapsed={collapsedIds.has(item.comment.id)}
              onToggleCollapse={toggleCollapse}
            />
          )}
          keyExtractor={(item) => item.comment.id.toString()}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyComponent}
          contentInsetAdjustmentBehavior="automatic"
          automaticallyAdjustContentInsets={true}
          contentContainerStyle={{
            paddingBottom: Platform.select({
              android: 100 + bottom,
              default: 0,
            }),
          }}
        />
      </ThemedView>
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 28,
    marginBottom: 8,
  },
  metadata: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  metadataText: {
    fontSize: 13,
    opacity: 0.5,
  },
  url: {
    fontSize: 14,
    marginBottom: 12,
  },
  storyText: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  commentsHeader: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  commentsTitle: {
    fontSize: 17,
    fontWeight: "600",
    opacity: 0.8,
  },
  commentContainer: {
    paddingHorizontal: 16,
  },
  nestedBorder: {
    paddingLeft: 12,
    borderLeftWidth: 2,
  },
  comment: {
    marginBottom: 16,
    paddingLeft: 12,
    borderLeftWidth: 2,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: "600",
  },
  commentTime: {
    fontSize: 12,
    opacity: 0.5,
  },
  collapseButton: {
    fontSize: 12,
    opacity: 0.5,
  },
  commentText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  noComments: {
    opacity: 0.5,
  },
});
