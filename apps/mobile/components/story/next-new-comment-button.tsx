import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Pressable, StyleSheet } from "react-native";

import { Icon, Text } from "@/components/ui";
import { Radius, withAlpha } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { hapticSelection } from "@/lib/haptics";

/**
 * Glass pill that jumps to the next comment posted since your last visit.
 * Positioned by `ThreadControls`; the label is short so it fits beside the
 * thread chevrons and the compose button.
 */
export function NextNewCommentButton({
  count,
  onPress,
}: {
  count: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const hasLiquidGlass = isLiquidGlassAvailable();
  const label = `Next new comment (${count})`;
  const shortLabel = `${count} new`;

  return (
    <GlassView
      glassEffectStyle="regular"
      tintColor={withAlpha(colors.primary, 0.75)}
      isInteractive
      style={[
        styles.pill,
        !hasLiquidGlass && { backgroundColor: colors.primary },
      ]}
    >
      <Pressable
        onPress={() => {
          hapticSelection();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [
          styles.press,
          !hasLiquidGlass && { opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Icon
          name="chevronDown"
          size={14}
          weight="semibold"
          color={colors.primaryForeground}
        />
        <Text
          variant="callout"
          weight="semibold"
          style={{ color: colors.primaryForeground }}
        >
          {shortLabel}
        </Text>
      </Pressable>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  press: {
    minHeight: 44,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});
