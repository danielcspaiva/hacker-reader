import { Link } from "expo-router";
import type { ComponentProps, ReactNode } from "react";
import { Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { CARD_GAP } from "@/constants/theme";
import { hapticSelection } from "@/lib/haptics";

interface LinkCardProps {
  href: ComponentProps<typeof Link>["href"];
  /**
   * What VoiceOver reads for the whole card. It sits on the wrapper view:
   * `Link` renders as a text element whose accessibility is cached, so a
   * recycled cell would keep reading the previous card.
   */
  accessibilityLabel: string;
  /** Long-press menu actions (`Link.Menu`). */
  menu?: ReactNode;
  /** Wide split view: select in place instead of pushing `href`. */
  onSelect?: () => void;
  children: ReactNode;
}

/** A Card that navigates: scales on press, selection haptic, peek preview. */
export function LinkCard({
  href,
  accessibilityLabel,
  menu,
  onSelect,
  children,
}: LinkCardProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[{ marginBottom: CARD_GAP }, animated]}
      accessible
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel}
    >
      {/* asChild: without it Link renders a Text, and the card becomes an inline
          attachment offset to the text baseline, so the paragraph clips the top
          ~2.7pt off the card's rounded corners. */}
      <Link
        href={href}
        asChild
        onPressIn={() => {
          scale.value = withTiming(0.98, { duration: 90 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 140 });
        }}
        onPress={(event) => {
          hapticSelection();
          // The peek preview still opens `href` as usual.
          if (onSelect) {
            event.preventDefault();
            onSelect();
          }
        }}
      >
        <Link.Trigger>
          <Pressable>{children}</Pressable>
        </Link.Trigger>
        {menu}
        <Link.Preview />
      </Link>
    </Animated.View>
  );
}
