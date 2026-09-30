import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, Text } from "@/components/ui";
import { Radius, withAlpha } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { hapticSelection } from "@/lib/haptics";

/**
 * Floating pill that jumps to the next comment posted since your last visit.
 * Sits bottom-centre, clear of the compose button on the right.
 */
export function NextNewCommentButton({
  count,
  onPress,
}: {
  count: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const hasLiquidGlass = isLiquidGlassAvailable();
  const label = `Next new comment (${count})`;

  return (
    <GlassView
      glassEffectStyle="regular"
      tintColor={withAlpha(colors.primary, 0.75)}
      isInteractive
      style={[
        styles.pill,
        { bottom: bottom + 16 },
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
          {label}
        </Text>
      </Pressable>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 100,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  press: {
    minHeight: 44,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});
