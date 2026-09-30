import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

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
  /** Posted since your previous visit. */
  isNew?: boolean;
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
  isNew = false,
  isHighlighted = false,
  onToggleCollapse,
  onOpenActions,
}: CommentItemProps) {
  const { colors } = useTheme();

  const hasChildren = replyCount > 0;
  const railCount = Math.min(depth, MAX_RAILS);
  const reduceMotion = useReducedMotion();

  const toggle = () => {
    hapticSelection();
    onToggleCollapse(comment);
  };

  // Chevron points down when collapsed, up when expanded. Rows are recycled by
  // FlashList, so snap (never tween) when the row now shows another comment.
  const rotation = useSharedValue(isCollapsed ? 0 : 180);
  const shownId = useRef<number | null>(null);
  useEffect(() => {
    const target = isCollapsed ? 0 : 180;
    if (reduceMotion || shownId.current !== comment.id) {
      rotation.value = target;
    } else {
      rotation.value = withTiming(target, { duration: 180 });
    }
    shownId.current = comment.id;
  }, [comment.id, isCollapsed, reduceMotion, rotation]);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

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
      {/* Tapping anywhere on the body toggles the subtree. Inner pressables
          (username, header, actions) and link spans handle their own taps;
          accessible={false} keeps them individually reachable for VoiceOver,
          whose collapse control is the header button. */}
      <Pressable
        style={styles.body}
        accessible={false}
        disabled={!hasChildren}
        onPress={toggle}
      >
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
            onPress={hasChildren ? toggle : undefined}
            disabled={!hasChildren}
            accessibilityRole="button"
            accessibilityHint={
              hasChildren
                ? isCollapsed
                  ? "Shows the replies"
                  : "Hides the replies"
                : undefined
            }
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
            {isNew ? (
              <View accessible accessibilityLabel="New comment">
                <Badge label="NEW" tone="primary" />
              </View>
            ) : null}
            <Text variant="caption" tone="muted" numeric>
              {timeAgo(comment.time)}
            </Text>
            {hasChildren ? (
              <View style={styles.collapse}>
                {isCollapsed ? (
                  <Animated.View
                    entering={reduceMotion ? undefined : FadeIn.duration(150)}
                  >
                    <Badge label={`+${replyCount}`} tone="neutral" />
                  </Animated.View>
                ) : null}
                <Animated.View style={chevronStyle}>
                  <Icon
                    name="chevronDown"
                    size={12}
                    weight="semibold"
                    color={colors.tertiaryForeground}
                  />
                </Animated.View>
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
      </Pressable>
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
