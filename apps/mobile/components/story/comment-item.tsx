import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { Badge, Icon, Text } from "@/components/ui";
import { GUTTER, withAlpha } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { timeAgo } from "@/lib/format/time";
import { hapticSelection } from "@/lib/haptics";
import type { Comment as CommentType } from "@/lib/hn";

import { HTMLText } from "./html-text";

const MAX_RAILS = 5;
const RAIL_WIDTH = 2;
const RAIL_SPACING = 6;
const RAIL_TO_TEXT = 10;

interface CommentItemProps {
  comment: CommentType;
  depth: number;
  replyCount: number;
  isCollapsed: boolean;
  isOP: boolean;
  isHighlighted?: boolean;
  onToggleCollapse: (comment: CommentType) => void;
  onOpenActions: (comment: CommentType) => void;
}

/**
 * One row of a thread. Kept presentational and native-view-free so FlashList
 * can recycle it cheaply on 1,000+ comment stories: actions are lifted to the
 * screen and open a single native sheet on demand.
 */
export function CommentItem({
  comment,
  depth,
  replyCount,
  isCollapsed,
  isOP,
  isHighlighted = false,
  onToggleCollapse,
  onOpenActions,
}: CommentItemProps) {
  const { colors } = useTheme();

  const hasChildren = replyCount > 0;
  const railCount = Math.min(depth, MAX_RAILS);

  return (
    <View
      style={[
        styles.container,
        isHighlighted && {
          backgroundColor: withAlpha(colors.primary, 0.1),
          borderRadius: 12,
          borderCurve: "continuous",
        },
        depth === 0 && {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.separator,
        },
      ]}
    >
      {railCount > 0 ? (
        <View style={styles.rails}>
          {Array.from({ length: railCount }, (_, index) => (
            <View
              key={index}
              style={[
                styles.rail,
                { backgroundColor: colors.rail[index % colors.rail.length] },
              ]}
            />
          ))}
        </View>
      ) : null}
      <View style={styles.body}>
        <View style={styles.header}>
          <Pressable
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel={`Profile of ${comment.by}`}
            onPress={() => {
              hapticSelection();
              router.push(`/user/${comment.by}`);
            }}
          >
            <Text
              variant="callout"
              weight="semibold"
              tone={isOP ? "primary" : "default"}
            >
              {comment.by}
            </Text>
          </Pressable>
          <Pressable
            onPress={
              hasChildren
                ? () => {
                    hapticSelection();
                    onToggleCollapse(comment);
                  }
                : undefined
            }
            disabled={!hasChildren}
            accessibilityRole="button"
            accessibilityLabel={
              isCollapsed
                ? `Expand comment by ${comment.by}, ${replyCount} replies`
                : `Collapse comment by ${comment.by}`
            }
            style={({ pressed }) => [
              styles.headerMain,
              pressed ? styles.pressed : null,
            ]}
          >
            {isOP ? <Badge label="OP" tone="primary" /> : null}
            <Text variant="caption" tone="muted" numeric>
              {timeAgo(comment.time)}
            </Text>
            {hasChildren ? (
              <View style={styles.collapse}>
                {isCollapsed ? (
                  <Badge label={`+${replyCount}`} tone="neutral" />
                ) : null}
                <Icon
                  name={isCollapsed ? "chevronDown" : "chevronUp"}
                  size={12}
                  weight="semibold"
                  color={colors.tertiaryForeground}
                />
              </View>
            ) : null}
          </Pressable>
          <Pressable
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Comment actions"
            onPress={() => {
              hapticSelection();
              onOpenActions(comment);
            }}
            style={({ pressed }) => [
              styles.moreButton,
              pressed ? styles.pressed : null,
            ]}
          >
            <Icon name="more" size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>
        {isCollapsed ? null : (
          <HTMLText html={comment.text} variant="callout" />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Vertical padding lives on the body, not the row, so rails span the full
  // row height and join the rails of the rows above and below.
  container: {
    flexDirection: "row",
    marginHorizontal: GUTTER,
    gap: RAIL_TO_TEXT,
  },
  rails: {
    flexDirection: "row",
    gap: RAIL_SPACING,
  },
  rail: {
    width: RAIL_WIDTH,
  },
  body: {
    flex: 1,
    gap: 6,
    paddingTop: 12,
    paddingBottom: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pressed: {
    opacity: 0.6,
  },
  headerMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 32,
  },
  collapse: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: "auto",
    paddingRight: 4,
  },
  moreButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
