import { LinkPreview } from "@/components/link-preview";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Spacing } from "@/constants/theme";
import { useIsBookmarked } from "@/hooks/use-bookmarks";
import { useThemeColor } from "@/hooks/use-theme-color";
import { getDomain, type HNItem } from "@hn/shared";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { StyleSheet, View } from "react-native";
import { StoryCardMetadata } from "./story-card-metadata";
import { useStoryActions } from "./use-story-actions";

export interface StoryCardProps {
  story: HNItem;
  index: number;
}

/**
 * Story card component for displaying HN stories in lists
 *
 * Shows story title, metadata, optional link preview, and actions
 * Supports long-press context menu for vote/bookmark/share actions
 */
export function StoryCard({ story, index }: StoryCardProps) {
  const actions = useStoryActions(story);
  const { data: isBookmarked = false } = useIsBookmarked(story.id);
  const borderColor = useThemeColor({}, "border");
  const textColor = useThemeColor({}, "text");

  const domain = getDomain(story.url);

  return (
    <GlassView
      glassEffectStyle="regular"
      isInteractive
      style={[styles.container, { borderColor }]}
    >
      <Link
        href={`/story/${story.id}?title=${encodeURIComponent(
          story.title || ""
        )}`}
      >
        <Link.Trigger>
          <View style={styles.header}>
            <View style={styles.content}>
              {/* Title with bookmark indicator */}
              <View style={styles.titleRow}>
                <ThemedText
                  type="bodyLarge"
                  style={styles.title}
                  numberOfLines={3}
                >
                  {story.title}
                </ThemedText>
                {isBookmarked && (
                  <IconSymbol
                    name="bookmark.fill"
                    size={16}
                    color={textColor}
                    style={styles.bookmarkIndicator}
                  />
                )}
              </View>

              {/* Domain with favicon */}
              {domain && (
                <View style={styles.domainContainer}>
                  <Image
                    source={{
                      uri: `https://www.google.com/s2/favicons?domain=${domain}&sz=16`,
                    }}
                    style={styles.favicon}
                    contentFit="contain"
                  />
                  <ThemedText type="caption" style={styles.domain}>
                    {domain}
                  </ThemedText>
                </View>
              )}

              {/* Metadata */}
              <StoryCardMetadata story={story} hasVoted={actions.hasVoted} />
            </View>

            {/* Link preview (if URL exists) */}
            {story.url && <LinkPreview url={story.url} compact />}
          </View>
        </Link.Trigger>

        {/* Context menu */}
        <Link.Menu>
          {/* Vote action */}
          <Link.MenuAction
            title={actions.hasVoted ? "Unvote" : "Upvote"}
            icon={
              actions.hasVoted ? "arrowtriangle.up.fill" : "arrowtriangle.up"
            }
            onPress={actions.handleVote}
          />

          {/* Bookmark action */}
          <Link.MenuAction
            title={isBookmarked ? "Remove Bookmark" : "Bookmark"}
            icon={isBookmarked ? "bookmark.fill" : "bookmark"}
            onPress={() => actions.handleBookmark(isBookmarked)}
          />

          {/* Share action */}
          <Link.MenuAction
            title="Share"
            icon="square.and.arrow.up"
            onPress={actions.handleShare}
          />
        </Link.Menu>

        {/* Preview modal */}
        <Link.Preview />
      </Link>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingHorizontal: isLiquidGlassAvailable() ? Spacing.lg : 0,
    paddingVertical:  Spacing.lg,
  },
  container: {
    flexDirection: "row",
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    borderRadius: isLiquidGlassAvailable() ? 16 : 0,
    borderWidth: isLiquidGlassAvailable() ? 0 : StyleSheet.hairlineWidth,
    marginBottom: Spacing.lg,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  title: {
    flex: 1,
  },
  bookmarkIndicator: {
    opacity: 0.6,
    marginTop: 2,
  },
  domainContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: Spacing.sm,
  },
  favicon: {
    width: 12,
    height: 12,
  },
  domain: {
    opacity: 0.6,
  },
});
