import { LinkPreview } from "@/components/link-preview";
import { ThemedText } from "@/components/themed-text";
import type { StoryWithComments } from "@/hooks/use-story";
import { useOGMetadata } from "@/hooks/use-og-metadata";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Spacing } from "@/constants/theme";
import { timeAgo } from "@hn/shared";
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { useIsPreview } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { HTMLText } from "./html-text";

// Negative margin needed for iOS 26+ header behavior to allow proper
// large-to-regular title transitions with multi-line large titles
const IOS_26_HEADER_MARGIN_OFFSET = -56;

interface StoryHeaderProps {
  story: StoryWithComments;
}

export function StoryHeader({ story }: StoryHeaderProps) {
  const isInsidePreview = useIsPreview();
  const tintColor = useThemeColor({}, "tint");
  const { data: metadata, isLoading } = useOGMetadata(story.url || "");

  const openURL = async (url: string) => {
    await WebBrowser.openBrowserAsync(url);
  };

  // Show URL text as fallback when no OG preview available
  const hasPreview = !isLoading && metadata && metadata.image;

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
        <ThemedText type="title" style={styles.title}>{story.title}</ThemedText>
        <View style={styles.metadata}>
          <ThemedText type="bodySmall" style={styles.metadataText}>
            {story.score} points by {story.by}
          </ThemedText>
          <ThemedText type="bodySmall" style={styles.metadataText}> • </ThemedText>
          <ThemedText type="bodySmall" style={styles.metadataText}>
            {timeAgo(story.time || 0)}
          </ThemedText>
          {story.descendants !== undefined && (
            <>
              <ThemedText type="bodySmall" style={styles.metadataText}> • </ThemedText>
              <ThemedText type="bodySmall" style={styles.metadataText}>
                {story.descendants} comments
              </ThemedText>
            </>
          )}
        </View>
        {story.url && (
          <>
            {!hasPreview && (
              <TouchableOpacity onPress={() => openURL(story.url!)}>
                <ThemedText type="bodySmall" style={[styles.url, { color: tintColor }]}>
                  {story.url}
                </ThemedText>
              </TouchableOpacity>
            )}
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
        <ThemedText type="bodyLarge" style={styles.commentsTitle}>
          Comments {story.descendants ? `(${story.descendants})` : ""}
        </ThemedText>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.md,
  },
  metadata: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: Spacing.md,
  },
  metadataText: {
    opacity: 0.6,
  },
  url: {
    marginBottom: Spacing.md,
  },
  storyText: {
    marginTop: Spacing.md,
  },
  commentsHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing.lg,
  },
  commentsTitle: {
    fontWeight: "600",
    opacity: 0.8,
  },
});
