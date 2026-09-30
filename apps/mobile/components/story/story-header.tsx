import { Link } from "expo-router";
import { useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { LinkPreview } from "@/components/link-preview";
import { Badge, Card, Icon, INLINE_ICON_SIZE, Text } from "@/components/ui";
import { GUTTER } from "@/constants/theme";
import { useExternalLink } from "@/hooks/use-external-link";
import { useTheme } from "@/hooks/use-theme";
import { timeAgo } from "@/lib/format/time";
import { getDomain } from "@/lib/format/url";
import { hapticImpact, hapticSelection } from "@/lib/haptics";
import type { StoryWithComments } from "@/lib/hn";

import { HTMLText } from "./html-text";

interface StoryHeaderProps {
  story: StoryWithComments;
  hasVoted: boolean;
  onVote: () => void;
  /** Bottom edge of the hero title, in list content coordinates. */
  onTitleBottomChange?: (bottom: number) => void;
}

const KIND_PREFIX = /^(ask|show|launch) hn:?\s*/i;

interface SplitTitle {
  kind: string | null;
  title: string;
}

/** "Ask HN: x" becomes the badge "Ask HN" and the title "x". */
function splitKind(title: string): SplitTitle {
  const match = KIND_PREFIX.exec(title);
  if (!match) return { kind: null, title };
  const name = match[1];
  return {
    kind: `${name.charAt(0).toUpperCase()}${name.slice(1).toLowerCase()} HN`,
    title: title.slice(match[0].length),
  };
}

export function StoryHeader({
  story,
  hasVoted,
  onVote,
  onTitleBottomChange,
}: StoryHeaderProps) {
  const heroY = useRef(0);
  const titleBottomInHero = useRef(0);
  const { colors } = useTheme();
  const openLink = useExternalLink();

  const domain = getDomain(story.url);
  // The badge already names the kind, so the hero drops the "Ask HN:" prefix.
  const { kind, title } = splitKind(story.title ?? "");
  const url = story.url;

  return (
    <View style={styles.container}>
      <View
        style={styles.hero}
        onLayout={(e) => {
          heroY.current = e.nativeEvent.layout.y;
          onTitleBottomChange?.(heroY.current + titleBottomInHero.current);
        }}
      >
        {domain || kind ? (
          <View style={styles.eyebrow}>
            {kind ? (
              <Badge label={kind} tone="primary" variant="solid" />
            ) : null}
            {domain ? (
              <Badge label={domain} tone="neutral" icon="link" surface="page" />
            ) : null}
          </View>
        ) : null}
        <Text
          variant="headline"
          scalable
          serif
          selectable
          accessibilityRole="header"
          onLayout={(e) => {
            const { y, height } = e.nativeEvent.layout;
            titleBottomInHero.current = y + height;
            onTitleBottomChange?.(heroY.current + titleBottomInHero.current);
          }}
        >
          {title}
        </Text>
        <View style={styles.byline}>
          <Text variant="callout" tone="muted">
            by{" "}
          </Text>
          <Link href={`/user/${story.by}`} asChild>
            <Pressable
              hitSlop={10}
              accessibilityRole="link"
              accessibilityLabel={`Profile of ${story.by}`}
              onPressIn={() => hapticSelection()}
            >
              <Text variant="callout" tone="primary" weight="semibold">
                {story.by}
              </Text>
            </Pressable>
          </Link>
          <Text variant="callout" tone="muted">
            {" "}
            · {timeAgo(story.time || 0)}
          </Text>
        </View>
        <View style={styles.stats}>
          <Pressable
            onPress={() => {
              hapticImpact();
              onVote();
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: hasVoted }}
            accessibilityLabel={`${story.score ?? 0} points. ${hasVoted ? "Remove upvote" : "Upvote"}`}
            style={({ pressed }) => [
              styles.votePill,
              {
                backgroundColor: hasVoted ? colors.primaryWash : colors.card,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Icon
              name="upvote"
              size={INLINE_ICON_SIZE.callout}
              weight="semibold"
              color={hasVoted ? colors.primaryInk : colors.foreground}
            />
            <Text
              variant="callout"
              weight="semibold"
              numeric
              tone={hasVoted ? "primary" : "default"}
            >
              {story.score ?? 0}
            </Text>
            <Text variant="callout" tone={hasVoted ? "primary" : "muted"}>
              points
            </Text>
          </Pressable>
          {story.descendants !== undefined ? (
            <View style={styles.stat}>
              <Icon
                name="comments"
                size={INLINE_ICON_SIZE.callout}
                weight="semibold"
                color={colors.mutedForeground}
              />
              <Text variant="callout" weight="semibold" numeric>
                {story.descendants}
              </Text>
              <Text variant="callout" tone="muted">
                comments
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {url ? (
        <LinkPreview
          url={url}
          onPress={() => void openLink(url)}
          accessibilityLabel={`Read article${domain ? ` on ${domain}` : ""}`}
        />
      ) : null}

      {story.text ? (
        <Card padding={18}>
          <HTMLText html={story.text} variant="body" />
        </Card>
      ) : null}

      <View style={styles.commentsHeader}>
        <Text variant="subtitle">Comments</Text>
        {story.descendants ? (
          <Text variant="subtitle" tone="tertiary" numeric>
            {story.descendants}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: GUTTER,
    paddingTop: 8,
    gap: 16,
  },
  hero: {
    gap: 10,
  },
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  byline: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  votePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderCurve: "continuous",
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  commentsHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    paddingTop: 8,
    paddingBottom: 4,
  },
});
