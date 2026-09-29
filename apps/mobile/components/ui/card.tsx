import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type ViewProps,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { hapticSelection } from "@/lib/haptics";

interface StaticCardProps extends ViewProps {
  onPress?: undefined;
  /** Inner padding; 16 by default, 0 for edge-to-edge content. */
  padding?: number;
}

interface PressableCardProps extends Omit<
  PressableProps,
  "style" | "children"
> {
  onPress: NonNullable<PressableProps["onPress"]>;
  padding?: number;
  style?: ViewProps["style"];
  children?: ReactNode;
}

export type CardProps = StaticCardProps | PressableCardProps;

/**
 * Solid content surface: `card` on the `background` page. Radius 24, continuous
 * corners, no border, no shadow. With `onPress` it scales to 0.98 and ticks.
 */
export function Card(props: CardProps) {
  return props.onPress === undefined ? (
    <StaticCard {...props} />
  ) : (
    <PressableCard {...props} />
  );
}

function StaticCard({ padding = 16, style, ...rest }: StaticCardProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.card, { backgroundColor: colors.card, padding }, style]}
      {...rest}
    />
  );
}

function PressableCard({
  padding = 16,
  style,
  children,
  onPress,
  onPressIn,
  onPressOut,
  ...rest
}: PressableCardProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animated, style]}>
      <Pressable
        accessibilityRole="button"
        onPressIn={(event) => {
          scale.value = withTiming(0.98, { duration: 90 });
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          scale.value = withTiming(1, { duration: 140 });
          onPressOut?.(event);
        }}
        onPress={(event) => {
          hapticSelection();
          onPress(event);
        }}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: pressed ? colors.cardPressed : colors.card,
            padding,
          },
        ]}
        {...rest}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    borderCurve: "continuous",
    overflow: "hidden",
  },
});
