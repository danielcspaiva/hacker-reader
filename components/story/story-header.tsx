import { LinkPreview } from "@/components/link-preview";
import { ThemedText } from "@/components/themed-text";
import type { StoryWithComments } from "@/hooks/use-story";
import { useThemeColor } from "@/hooks/use-theme-color";
import { timeAgo } from "@/lib/utils/time";
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import * as WebBrowser from "expo-web-browser";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { HTMLText } from "./html-text";
import { useIsPreview } from "expo-router";

// Negative margin needed for iOS 26+ header behavior to allow proper
// large-to-regular title transitions with multi-line large titles
const IOS_26_HEADER_MARGIN_OFFSET = -36;

interface StoryHeaderProps {
  story: StoryWithComments;
}

export function StoryHeader({ story }: StoryHeaderProps) {
  const tintColor = useThemeColor({}, "tint");
  const isInsidePreview = useIsPreview();

  const openURL = async (url: string) => {
    await WebBrowser.openBrowserAsync(url);
  };

  return (
    <>
      <View style={[
        styles.container,
        {
          marginTop: isLiquidGlassAvailable() && !isInsidePreview
            ? IOS_26_HEADER_MARGIN_OFFSET
            : 0,
        },
      ]}>
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
            <TouchableOpacity
              onPress={() => openURL(story.url!)}
              accessibilityRole="link"
              activeOpacity={0.8}
            >
              <LinkPreview url={story.url} />
            </TouchableOpacity>
          </>
        )}
        {story.text && <HTMLText html={story.text} style={styles.storyText} />}
      </View>
      <View style={styles.commentsHeader}>
        <ThemedText style={styles.commentsTitle}>
          Comments {story.descendants ? `(${story.descendants})` : ""}
        </ThemedText>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
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
});
