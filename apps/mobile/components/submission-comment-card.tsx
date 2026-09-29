import { StyleSheet, View } from "react-native";

import { LinkCard } from "@/components/link-card";
import { Card, Icon, INLINE_ICON_SIZE, Text } from "@/components/ui";
import { useCommentContext } from "@/hooks/use-comment-context";
import { useTheme } from "@/hooks/use-theme";
import { timeAgo } from "@/lib/format/time";
import type { HNItem } from "@/lib/hn";
import { stripHTML } from "@/lib/html/parse";

interface SubmissionCommentCardProps {
  comment: HNItem;
}

const PREVIEW_LENGTH = 220;

export function SubmissionCommentCard({ comment }: SubmissionCommentCardProps) {
  const { colors } = useTheme();
  const { label, storyId } = useCommentContext(comment);

  const text = comment.text ? stripHTML(comment.text) : "";
  const preview =
    text.length > PREVIEW_LENGTH
      ? `${text.substring(0, PREVIEW_LENGTH).trimEnd()}...`
      : text;
  return (
    <LinkCard
      href={`/story/${storyId ?? comment.parent}?commentId=${comment.id}`}
    >
      <Card padding={14} style={styles.card}>
        <View style={styles.context}>
          <Icon
            name="reply"
            size={INLINE_ICON_SIZE.caption}
            color={colors.mutedForeground}
          />
          <Text
            variant="caption"
            tone="muted"
            weight="medium"
            numberOfLines={1}
            style={styles.contextText}
          >
            {label ?? "Comment"}
          </Text>
          <Text variant="caption" tone="tertiary" numeric>
            {timeAgo(comment.time ?? 0)}
          </Text>
        </View>
        <Text variant="callout" numberOfLines={5}>
          {preview}
        </Text>
      </Card>
    </LinkCard>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    gap: 8,
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
