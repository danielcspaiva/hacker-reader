import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { LinkCard } from "@/components/link-card";
import { Card, Icon, INLINE_ICON_SIZE, Text } from "@/components/ui";
import {
  useCommentContext,
  type KnownCommentContext,
} from "@/hooks/use-comment-context";
import { prefetchStory } from "@/hooks/use-story";
import { useTheme } from "@/hooks/use-theme";
import { timeAgo, timeAgoSpoken } from "@/lib/format/time";
import type { HNItem } from "@/lib/hn";
import { stripHTML } from "@/lib/html/parse";

interface SubmissionCommentCardProps {
  comment: HNItem;
  /** Story context already known (search results), which skips the lookups. */
  known?: KnownCommentContext;
  /** Show the comment's author in the header row (search results). */
  showAuthor?: boolean;
}

const PREVIEW_LENGTH = 220;

export function SubmissionCommentCard({
  comment,
  known,
  showAuthor = false,
}: SubmissionCommentCardProps) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { label, storyId } = useCommentContext(comment, known);

  // Search hits already carry a story id and the list prefetches them once
  // they are on screen. A submission comment learns its story id here.
  useEffect(() => {
    if (
      known?.storyId !== undefined ||
      storyId === undefined ||
      storyId === null
    )
      return;
    void prefetchStory(queryClient, storyId);
  }, [known?.storyId, queryClient, storyId]);

  const text = comment.text ? stripHTML(comment.text) : "";
  const preview =
    text.length > PREVIEW_LENGTH
      ? `${text.substring(0, PREVIEW_LENGTH).trimEnd()}...`
      : text;
  return (
    <LinkCard
      href={`/story/${storyId ?? comment.parent}?commentId=${comment.id}`}
      accessibilityLabel={[
        !label || label.startsWith("Reply to")
          ? (label ?? "Comment")
          : `Comment on ${label}`,
        showAuthor && comment.by ? `by ${comment.by}` : null,
        timeAgoSpoken(comment.time ?? 0),
        preview,
      ]
        .filter(Boolean)
        .join(", ")}
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
            {showAuthor && comment.by
              ? `${comment.by} · ${timeAgo(comment.time ?? 0)}`
              : timeAgo(comment.time ?? 0)}
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
