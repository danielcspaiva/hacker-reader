import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NextNewCommentButton } from "@/components/story/next-new-comment-button";
import { Icon } from "@/components/ui";
import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { hapticSelection } from "@/lib/haptics";

/** Width of the compose button (56) plus its gutter and the gap to it. */
const COMPOSE_CLEARANCE = 16 + 56;

interface ThreadControlsProps {
  /** Comments posted since the last visit; the pill is hidden at 0. */
  newCommentCount: number;
  /** Show the previous/next thread chevrons. */
  showThreadNav: boolean;
  /** Leave room for the compose button on the right. */
  reserveComposeButton: boolean;
  onNextNewComment: () => void;
  onNextThread: () => void;
  onPreviousThread: () => void;
}

/**
 * The floating controls over the comment list, in one row so they can never
 * overlap: the "N new" pill on the left, the thread chevrons on the right, and
 * the compose button (its own component) beyond them.
 */
export function ThreadControls({
  newCommentCount,
  showThreadNav,
  reserveComposeButton,
  onNextNewComment,
  onNextThread,
  onPreviousThread,
}: ThreadControlsProps) {
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const hasLiquidGlass = isLiquidGlassAvailable();

  if (newCommentCount === 0 && !showThreadNav) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.row,
        {
          bottom: bottom + 16,
          right: 16 + (reserveComposeButton ? COMPOSE_CLEARANCE : 0),
        },
      ]}
    >
      {newCommentCount > 0 ? (
        <NextNewCommentButton
          count={newCommentCount}
          onPress={onNextNewComment}
        />
      ) : null}
      {showThreadNav ? (
        <GlassView
          glassEffectStyle="regular"
          isInteractive
          style={[
            styles.cluster,
            !hasLiquidGlass && {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: StyleSheet.hairlineWidth,
            },
          ]}
        >
          <ChevronButton
            icon="chevronUp"
            label="Previous top-level comment"
            onPress={onPreviousThread}
          />
          <ChevronButton
            icon="chevronDown"
            label="Next top-level comment"
            onPress={onNextThread}
          />
        </GlassView>
      ) : null}
    </View>
  );
}

function ChevronButton({
  icon,
  label,
  onPress,
}: {
  icon: "chevronUp" | "chevronDown";
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.chevron, pressed && { opacity: 0.6 }]}
    >
      <Icon name={icon} size={16} weight="semibold" color={colors.foreground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    position: "absolute",
    left: 16,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cluster: {
    marginLeft: "auto",
    flexDirection: "row",
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  chevron: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
