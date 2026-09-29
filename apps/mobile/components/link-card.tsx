import { Link } from "expo-router";
import type { ComponentProps, ReactNode } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { CARD_GAP } from "@/constants/theme";
import { hapticSelection } from "@/lib/haptics";

interface LinkCardProps {
  href: ComponentProps<typeof Link>["href"];
  /** Long-press menu actions (`Link.Menu`). */
  menu?: ReactNode;
  children: ReactNode;
}

/** A Card that navigates: scales on press, selection haptic, peek preview. */
export function LinkCard({ href, menu, children }: LinkCardProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[{ marginBottom: CARD_GAP }, animated]}>
      <Link
        href={href}
        onPressIn={() => {
          scale.value = withTiming(0.98, { duration: 90 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 140 });
        }}
        onPress={() => hapticSelection()}
      >
        <Link.Trigger>{children}</Link.Trigger>
        {menu}
        <Link.Preview />
      </Link>
    </Animated.View>
  );
}
