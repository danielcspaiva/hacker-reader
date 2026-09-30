import { Pressable, StyleSheet, View } from "react-native";

import {
  Card,
  Icon,
  INLINE_ICON_SIZE,
  ListSection,
  ListSlot,
  Skeleton,
  Text,
} from "@/components/ui";
import { useTheme } from "@/hooks/use-theme";
import { hapticSelection } from "@/lib/haptics";
import {
  commentsLabel,
  generatedAgo,
  type StorySummary,
  type SummaryTheme,
} from "@/lib/pro/summary";

/** Placeholder while the summary is generated (10-20 seconds). */
export function SummarySkeleton() {
  return (
    <View style={styles.stack} accessibilityLabel="Generating summary">
      <Card style={styles.card}>
        <Skeleton width={70} height={11} />
        <Skeleton height={16} />
        <Skeleton height={16} />
        <Skeleton width="60%" height={16} />
      </Card>
      <Card style={styles.card}>
        <Skeleton width={90} height={11} />
        <Skeleton height={16} />
        <Skeleton height={16} />
        <Skeleton height={16} />
        <Skeleton width="80%" height={16} />
      </Card>
      {[0, 1, 2].map((index) => (
        <Card key={index} style={styles.card}>
          <Skeleton width="45%" height={18} />
          <Skeleton height={14} />
          <Skeleton width="70%" height={14} />
        </Card>
      ))}
      <Text variant="caption" tone="muted" style={styles.center}>
        Summarizing the article and the comments. This can take up to 20
        seconds.
      </Text>
    </View>
  );
}

function ThemeCard({
  theme,
  onOpenComment,
}: {
  theme: SummaryTheme;
  onOpenComment: (commentId: number) => void;
}) {
  const { colors } = useTheme();
  const firstCommentId = theme.commentIds[0];

  return (
    <Card style={styles.card}>
      <Text variant="subtitle" selectable>
        {theme.title}
      </Text>
      <Text variant="callout" tone="muted" selectable>
        {theme.summary}
      </Text>
      {firstCommentId !== undefined ? (
        <Pressable
          onPress={() => {
            hapticSelection();
            onOpenComment(firstCommentId);
          }}
          hitSlop={8}
          accessibilityRole="link"
          accessibilityLabel={`Show ${commentsLabel(theme.commentIds.length)} in the thread`}
          style={({ pressed }) => [styles.link, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Icon
            name="comments"
            size={INLINE_ICON_SIZE.callout}
            weight="semibold"
            color={colors.primaryInk}
          />
          <Text variant="callout" tone="primary" weight="semibold">
            {commentsLabel(theme.commentIds.length)}
          </Text>
          <Icon
            name="chevronRight"
            size={INLINE_ICON_SIZE.caption}
            weight="semibold"
            color={colors.primaryInk}
          />
        </Pressable>
      ) : null}
    </Card>
  );
}

/**
 * A ready summary: article TL;DR, discussion summary, theme cards that link to
 * their first cited comment, disagreements and the footer. Plain text only.
 */
export function SummaryBody({
  summary,
  now,
  onOpenComment,
}: {
  summary: StorySummary;
  now: number;
  onOpenComment: (commentId: number) => void;
}) {
  const { discussion } = summary;
  return (
    <View style={styles.stack}>
      {summary.articleTldr ? (
        <Card style={styles.card}>
          <Text variant="label" tone="muted">
            Article
          </Text>
          <Text variant="body" selectable>
            {summary.articleTldr}
          </Text>
        </Card>
      ) : null}

      <Card style={styles.card}>
        <Text variant="label" tone="muted">
          Discussion
        </Text>
        <Text variant="body" selectable>
          {discussion.summary}
        </Text>
      </Card>

      {discussion.themes.length > 0 ? (
        <View style={styles.themes}>
          <Text variant="label" tone="muted" style={styles.eyebrow}>
            Themes
          </Text>
          {discussion.themes.map((theme) => (
            <ThemeCard
              key={theme.title}
              theme={theme}
              onOpenComment={onOpenComment}
            />
          ))}
        </View>
      ) : null}

      {discussion.disagreements?.length ? (
        <ListSection title="Where people disagree">
          {discussion.disagreements.map((disagreement) => (
            <ListSlot key={disagreement.question}>
              <View style={styles.disagreement}>
                <Text variant="callout" weight="semibold" selectable>
                  {disagreement.question}
                </Text>
                {disagreement.sides.map((side) => (
                  <Text
                    key={side}
                    variant="callout"
                    tone="muted"
                    selectable
                  >{`• ${side}`}</Text>
                ))}
              </View>
            </ListSlot>
          ))}
        </ListSection>
      ) : null}

      <Text variant="caption" tone="tertiary" style={styles.center}>
        {`Generated ${generatedAgo(summary.generatedAt, now)} · AI can be wrong`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  card: { gap: 8 },
  themes: { gap: 8 },
  eyebrow: { paddingHorizontal: 16 },
  link: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    paddingTop: 2,
  },
  disagreement: { gap: 4 },
  center: { textAlign: "center" },
});
