import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

import { Icon, INLINE_ICON_SIZE } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon-names";
import { Text } from "@/components/ui/text";
import {
  Radius,
  WashAlpha,
  withAlpha,
  type ThemeColors,
} from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { hapticImpact } from "@/lib/haptics";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  /** Stretch to the container width. */
  fullWidth?: boolean;
  accessibilityLabel?: string;
}

const HEIGHT = { sm: 36, md: 44, lg: 52 } as const;
const PADDING = { sm: 14, md: 18, lg: 22 } as const;

function buttonColors(variant: ButtonVariant, colors: ThemeColors) {
  switch (variant) {
    case "primary":
      return { fill: colors.primary, ink: colors.primaryForeground };
    case "secondary":
      return { fill: colors.primaryWash, ink: colors.primaryInk };
    case "destructive":
      return {
        fill: withAlpha(colors.danger, WashAlpha.destructive),
        ink: colors.danger,
      };
    case "ghost":
      return { fill: "transparent", ink: colors.primaryInk };
  }
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  accessibilityLabel,
}: ButtonProps) {
  const { colors } = useTheme();

  const { fill, ink } = buttonColors(variant, colors);
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={() => {
        hapticImpact();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        {
          minHeight: HEIGHT[size],
          paddingHorizontal: PADDING[size],
          backgroundColor: fill,
        },
        fullWidth ? styles.full : null,
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={ink} />
      ) : icon ? (
        <Icon
          name={icon}
          size={
            size === "sm" ? INLINE_ICON_SIZE.callout : INLINE_ICON_SIZE.body
          }
          weight="semibold"
          color={ink}
        />
      ) : null}
      <Text
        variant={size === "sm" ? "callout" : "body"}
        weight="semibold"
        style={{ color: ink }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    gap: 8,
    borderRadius: Radius.control,
    borderCurve: "continuous",
  },
  full: { alignSelf: "stretch" },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
});
