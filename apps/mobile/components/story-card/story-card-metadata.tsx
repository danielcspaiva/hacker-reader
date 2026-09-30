import { StyleSheet, View } from "react-native";

import { Icon, INLINE_ICON_SIZE, Text } from "@/components/ui";
import { useTheme } from "@/hooks/use-theme";
import { timeAgo } from "@/lib/format/time";
import type { HNItem } from "@/lib/hn";

interface StoryCardMetadataProps {
  story: HNItem;
  hasVoted: boolean;
}

/** Points and comments on the left, author and age on the right. */
export function StoryCardMetadata({ story, hasVoted }: StoryCardMetadataProps) {
  const { colors } = useTheme();
  const comments = story.descendants || 0;
  const points = story.score ?? 0;

  return (
    <View style={styles.row}>
      <View
        style={styles.stats}
        accessible
        accessibilityLabel={`${points} points, ${comments} comments`}
      >
        <View style={styles.stat}>
          <Icon
            name="upvote"
            size={INLINE_ICON_SIZE.caption}
            weight="semibold"
            color={hasVoted ? colors.primaryInk : colors.mutedForeground}
          />
          <Text
            variant="caption"
            weight="semibold"
            numeric
            tone={hasVoted ? "primary" : "muted"}
          >
            {points}
          </Text>
        </View>
        <View style={styles.stat}>
          <Icon
            name="comments"
            size={INLINE_ICON_SIZE.caption}
            weight="semibold"
            color={colors.mutedForeground}
          />
          <Text variant="caption" weight="semibold" numeric tone="muted">
            {comments}
          </Text>
        </View>
      </View>
      <Text variant="caption" tone="muted" numberOfLines={1} style={styles.by}>
        {story.by ? `${story.by} · ` : ""}
        {timeAgo(story.time || 0)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  by: {
    flexShrink: 1,
  },
});
