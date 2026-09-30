import { useEffect } from "react";
import type { DimensionValue, ViewProps } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/use-theme";

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewProps["style"];
}

/** Pulsing placeholder block. Compose several to mirror the real layout. */
export function Skeleton({
  width = "100%",
  height = 16,
  radius = 8,
  style,
}: SkeletonProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 0.8;
      return;
    }
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
    return () => cancelAnimation(opacity);
  }, [opacity, reduceMotion]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        animated,
        {
          width,
          height,
          borderRadius: radius,
          borderCurve: "continuous",
          backgroundColor: colors.muted,
        },
        style,
      ]}
    />
  );
}
