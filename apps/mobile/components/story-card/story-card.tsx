import { Image } from "expo-image";
import { Link } from "expo-router";
import { StyleSheet, View } from "react-native";

import { LinkCard } from "@/components/link-card";
import { LinkPreview } from "@/components/link-preview";
import { Card, ICON_GLYPHS, Icon, Text } from "@/components/ui";
import { Radius } from "@/constants/theme";
import { useStoryActions } from "@/hooks/use-story-actions";
import { useTheme } from "@/hooks/use-theme";
import { timeAgoSpoken } from "@/lib/format/time";
import { getDomain } from "@/lib/format/url";
import type { HNItem } from "@/lib/hn";

import { StoryCardMetadata } from "./story-card-metadata";

export interface StoryCardProps {
  story: HNItem;
  /** List position shown ahead of the domain (feed only). */
  rank?: number;
}

/** Width of the flush image panel on the card's right edge. */
const THUMBNAIL_WIDTH = 104;
// The text column's padding; the image panel uses the same inset so it sits in
// an even frame (top, right, bottom and the gap to the text all match).
const CARD_PADDING = 14;

/**
 * The image panel sits inset from the card's edge with concentric corners
 * (card radius minus the inset), so its curves run parallel to the card's and
 * no square edge meets the text column. Shared with the skeleton.
 */
export const thumbnailPanel = {
  width: THUMBNAIL_WIDTH,
  // Square by default; a long title stretches the row and the image grows
  // taller with it. `height` is explicit so a skeleton's default can't cap it.
  minHeight: THUMBNAIL_WIDTH,
  height: undefined,
  alignSelf: "stretch",
  margin: CARD_PADDING,
  marginLeft: 0,
  borderRadius: Radius.card - CARD_PADDING,
  borderCurve: "continuous",
  overflow: "hidden",
} as const;

/**
 * Story row card: a text column (rank and domain eyebrow, strong title, stats
 * footer) beside an edge-to-edge image panel that spans the card's height.
 * Cards without an image use the full width. Long press opens the
 * vote/bookmark/share menu.
 */
export function StoryCard({ story, rank }: StoryCardProps) {
  const { colors } = useTheme();
  const actions = useStoryActions(story);
  const { isBookmarked } = actions;
  const domain = getDomain(story.url);
  const points = story.score ?? 0;
  const comments = story.descendants || 0;
  const accessibilityLabel = [
    rank !== undefined ? `${rank}. ${story.title ?? ""}` : story.title,
    domain,
    `${points} ${points === 1 ? "point" : "points"}`,
    `${comments} ${comments === 1 ? "comment" : "comments"}`,
    story.by && `by ${story.by}`,
    timeAgoSpoken(story.time || 0),
    actions.hasVoted && "Upvoted",
    isBookmarked && "Bookmarked",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <LinkCard
      href={`/story/${story.id}`}
      accessibilityLabel={accessibilityLabel}
      menu={
        <Link.Menu>
          <Link.MenuAction
            title={actions.hasVoted ? "Unvote" : "Upvote"}
            icon={ICON_GLYPHS.upvote.ios}
            onPress={actions.handleVote}
          />
          <Link.MenuAction
            title={isBookmarked ? "Remove Bookmark" : "Bookmark"}
            icon={
              isBookmarked
                ? ICON_GLYPHS.bookmarkFilled.ios
                : ICON_GLYPHS.bookmark.ios
            }
            onPress={actions.handleBookmark}
          />
          <Link.MenuAction
            title="Share"
            icon={ICON_GLYPHS.share.ios}
            onPress={actions.handleShare}
          />
          <Link.Menu title="More" icon={ICON_GLYPHS.more.ios}>
            <Link.MenuAction
              title="Hide"
              icon={ICON_GLYPHS.hide.ios}
              onPress={actions.handleHide}
            />
            <Link.MenuAction
              title="Flag"
              icon={ICON_GLYPHS.flag.ios}
              onPress={actions.handleFlag}
            />
            <Link.MenuAction
              title="Block User"
              icon={ICON_GLYPHS.block.ios}
              onPress={actions.handleBlockUser}
            />
          </Link.Menu>
        </Link.Menu>
      }
    >
      <Card padding={0} style={styles.card}>
        <View style={styles.row}>
          <View style={styles.body}>
            {domain || isBookmarked ? (
              <View style={styles.eyebrow}>
                {rank !== undefined && domain ? (
                  <Text variant="caption" weight="bold" numeric tone="primary">
                    {rank}
                  </Text>
                ) : null}
                {domain ? (
                  <View style={styles.domain}>
                    <View
                      style={[
                        styles.favicon,
                        { backgroundColor: colors.muted },
                      ]}
                    >
                      <Text variant="label" weight="bold" tone="muted">
                        {domain.charAt(0).toUpperCase()}
                      </Text>
                      <Image
                        source={{
                          uri: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
                        }}
                        style={StyleSheet.absoluteFill}
                        contentFit="contain"
                      />
                    </View>
                    <Text
                      variant="caption"
                      tone="muted"
                      numberOfLines={1}
                      style={styles.domainText}
                    >
                      {domain}
                    </Text>
                  </View>
                ) : null}
                {isBookmarked && (
                  <Icon
                    name="bookmarkFilled"
                    size={13}
                    color={colors.primary}
                    accessibilityLabel="Bookmarked"
                  />
                )}
              </View>
            ) : null}

            <View style={styles.titleRow}>
              {rank !== undefined && !domain ? (
                <Text
                  variant="subtitle"
                  weight="bold"
                  numeric
                  tone="primary"
                  style={styles.rank}
                >
                  {rank}
                </Text>
              ) : null}
              <Text
                variant="subtitle"
                weight="semibold"
                numberOfLines={3}
                style={styles.title}
              >
                {story.title}
              </Text>
            </View>

            <StoryCardMetadata story={story} hasVoted={actions.hasVoted} />
          </View>

          {story.url ? (
            <LinkPreview url={story.url} compact style={thumbnailPanel} />
          ) : null}
        </View>
      </Card>
    </LinkCard>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  body: {
    flex: 1,
    padding: CARD_PADDING,
    gap: 8,
    justifyContent: "space-between",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  rank: {
    minWidth: 22,
  },
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  domain: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  domainText: {
    flexShrink: 1,
  },
  favicon: {
    width: 16,
    height: 16,
    borderRadius: 5,
    borderCurve: "continuous",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
  },
});
