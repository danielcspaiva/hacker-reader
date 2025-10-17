import { LinkPreview } from "@/components/link-preview";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useComment, useStory } from "@/hooks/use-story";
import { useThemeColor } from "@/hooks/use-theme-color";
import { parseHTMLWithLinks } from "@/lib/utils/html";
import { timeAgo } from "@/lib/utils/time";
import { Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function Comment({ commentId }: { commentId: number }) {
  const { data: comment, isLoading } = useComment(commentId);
  const [showReplies, setShowReplies] = useState(true);
  const borderColor = useThemeColor({}, "border");
  const tintColor = useThemeColor({}, "tint");

  if (isLoading) {
    return null;
  }

  if (!comment || comment.deleted || comment.dead) {
    return null;
  }

  return (
    <View style={[styles.comment, { borderLeftColor: borderColor }]}>
      <View style={styles.commentHeader}>
        <ThemedText style={styles.commentAuthor}>{comment.by}</ThemedText>
        <ThemedText style={styles.commentTime}>
          {" "}
          • {timeAgo(comment.time || 0)}
        </ThemedText>
        {comment.kids && comment.kids.length > 0 && (
          <TouchableOpacity onPress={() => setShowReplies(!showReplies)}>
            <ThemedText style={styles.collapseButton}>
              {" "}
              [{showReplies ? "−" : `+${comment.kids.length}`}]
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>
      {showReplies && (
        <>
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
          {comment.kids && comment.kids.length > 0 && (
            <View style={styles.replies}>
              {comment.kids.map((kidId) => (
                <Comment key={kidId} commentId={kidId} />
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

export default function StoryDetailScreen() {
  const { id } = useLocalSearchParams();
  const { data: story, isLoading } = useStory(Number(id));

  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const borderColor = useThemeColor({}, "border");

  const { bottom } = useSafeAreaInsets();

  const openURL = async (url: string) => {
    await WebBrowser.openBrowserAsync(url);
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "",
            headerShown: true,
            headerTransparent: true,
            headerBackButtonDisplayMode: "minimal",
          }}
        />
        <ThemedView style={styles.centered}>
          <ActivityIndicator size="large" color={textColor} />
        </ThemedView>
      </>
    );
  }

  if (!story) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Not Found",
            headerShown: true,
            headerTransparent: true,
            headerBackButtonDisplayMode: "minimal",
          }}
        />
        <ThemedView style={styles.centered}>
          <ThemedText>Story not found</ThemedText>
        </ThemedView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "",
          headerTransparent: true,
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <ThemedView style={styles.container}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            paddingBottom: Platform.select({
              android: 100 + bottom,
              default: 0,
            }),
          }}
        >
          <View style={styles.header}>
            <ThemedText style={styles.title}>{story.title}</ThemedText>
            <View style={styles.metadata}>
              <ThemedText style={styles.metadataText}>
                {story.score} points by {story.by}
              </ThemedText>
              <ThemedText style={styles.metadataText}> • </ThemedText>
              <ThemedText style={styles.metadataText}>
                {timeAgo(story.time || 0)}
              </ThemedText>
              {story.descendants !== undefined && (
                <>
                  <ThemedText style={styles.metadataText}> • </ThemedText>
                  <ThemedText style={styles.metadataText}>
                    {story.descendants} comments
                  </ThemedText>
                </>
              )}
            </View>
            {story.url && (
              <>
                <TouchableOpacity onPress={() => openURL(story.url!)}>
                  <ThemedText style={[styles.url, { color: tintColor }]}>
                    {story.url}
                  </ThemedText>
                </TouchableOpacity>
                <LinkPreview url={story.url} />
              </>
            )}
            {story.text && (
              <ThemedText style={styles.storyText}>
                {parseHTMLWithLinks(story.text)?.map((part, index) => {
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

          <View style={[styles.divider, { backgroundColor: borderColor }]} />

          <View style={styles.commentsContainer}>
            {story.kids && story.kids.length > 0 ? (
              story.kids.map((commentId) => (
                <Comment key={commentId} commentId={commentId} />
              ))
            ) : (
              <View style={styles.centered}>
                <ThemedText style={styles.noComments}>
                  No comments yet
                </ThemedText>
              </View>
            )}
          </View>
        </ScrollView>
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
  },
  header: {
    padding: 16,
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
  divider: {
    height: 4,
  },
  commentsContainer: {
    padding: 16,
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
  replies: {
    marginTop: 8,
  },
  noComments: {
    opacity: 0.5,
    marginTop: 32,
  },
});
