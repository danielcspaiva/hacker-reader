import { StyleSheet, View } from "react-native";

import { LinkCard } from "@/components/link-card";
import { Card, Icon, INLINE_ICON_SIZE, Text } from "@/components/ui";
import { useCommentContext } from "@/hooks/use-comment-context";
import { useTheme } from "@/hooks/use-theme";
import { timeAgo, timeAgoSpoken } from "@/lib/format/time";
import { replyContextLabel, type ReplyEntry } from "@/lib/hn";
import { stripHTML } from "@/lib/html/parse";

interface ReplyCardProps {
  entry: ReplyEntry;
  /** Newer than the last time the inbox was opened. */
  unread: boolean;
}

/** One reply in the inbox: who, when, the text, and what it answers. */
export function ReplyCard({ entry, unread }: ReplyCardProps) {
  const { colors } = useTheme();
  const { reply, parent } = entry;
  const context = replyContextLabel(parent);
  // A reply to a story already knows its story; one to a comment resolves it.
  const { storyId } = useCommentContext(reply, {
    storyId: parent.type === "comment" ? undefined : parent.id,
    storyTitle: context,
  });
  const text = reply.text ? stripHTML(reply.text) : "";

  return (
    <LinkCard
      href={`/story/${storyId ?? reply.parent}?commentId=${reply.id}`}
      accessibilityLabel={[
        unread ? "Unread" : null,
        `${reply.by} replied`,
        timeAgoSpoken(reply.time ?? 0),
        text,
        context,
      ]
        .filter(Boolean)
        .join(", ")}
    >
      <Card padding={14} style={styles.card}>
        <View style={styles.header}>
          {unread ? (
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          ) : null}
          <Text
            variant="callout"
            weight="semibold"
            numberOfLines={1}
            style={styles.author}
          >
            {reply.by}
          </Text>
          <Text variant="caption" tone="tertiary" numeric>
            {timeAgo(reply.time ?? 0)}
          </Text>
        </View>
        <Text variant="callout" numberOfLines={5}>
          {text}
        </Text>
        <View style={styles.context}>
          <Icon
            name="reply"
            size={INLINE_ICON_SIZE.caption}
            color={colors.mutedForeground}
          />
          <Text
            variant="caption"
            tone="muted"
            numberOfLines={1}
            style={styles.contextText}
          >
            {context}
          </Text>
        </View>
      </Card>
    </LinkCard>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  author: {
    flex: 1,
  },
  context: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  contextText: {
    flex: 1,
  },
});
