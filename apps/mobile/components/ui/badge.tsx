import { StyleSheet, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon-names";
import { Text } from "@/components/ui/text";
import {
  Radius,
  WashAlpha,
  withAlpha,
  type ThemeColors,
} from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type BadgeTone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger";

type BadgeVariant = "soft" | "solid";
type ColorKey = keyof ThemeColors;

interface ToneTokens {
  /** Text and glyph on the soft wash. */
  softInk: ColorKey;
  /** Solid fill, and the base of the soft wash for coloured tones. */
  fill: ColorKey;
  /** Text and glyph on the solid fill. */
  solidInk: ColorKey;
}

const TONES = {
  neutral: {
    softInk: "mutedForeground",
    fill: "muted",
    solidInk: "foreground",
  },
  primary: {
    softInk: "primaryInk",
    fill: "primary",
    solidInk: "primaryForeground",
  },
  success: { softInk: "success", fill: "success", solidInk: "background" },
  warning: { softInk: "warning", fill: "warning", solidInk: "background" },
  danger: { softInk: "danger", fill: "danger", solidInk: "background" },
} as const satisfies Record<BadgeTone, ToneTokens>;

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  /** `soft`: tinted wash. `solid`: filled, for emphasis (e.g. a Job or Ask tag). */
  variant?: BadgeVariant;
  icon?: IconName;
}

function badgeColors(
  tone: BadgeTone,
  variant: BadgeVariant,
  colors: ThemeColors
) {
  const tokens = TONES[tone];
  if (variant === "solid") {
    return { ink: colors[tokens.solidInk], fill: colors[tokens.fill] };
  }
  return {
    ink: colors[tokens.softInk],
    // Neutral is already a quiet fill; the coloured tones wash their base.
    fill:
      tone === "neutral"
        ? colors.muted
        : withAlpha(colors[tokens.fill], WashAlpha.badge),
  };
}

/** Static capsule for tags and counts. */
export function Badge({
  label,
  tone = "neutral",
  variant = "soft",
  icon,
}: BadgeProps) {
  const { colors } = useTheme();
  const { ink, fill } = badgeColors(tone, variant, colors);
  return (
    <View style={[styles.badge, { backgroundColor: fill }]}>
      {icon ? (
        <Icon name={icon} size={11} weight="semibold" color={ink} />
      ) : null}
      <Text
        variant="caption"
        weight="semibold"
        style={[styles.label, { color: ink }]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  label: { fontVariant: ["tabular-nums"] },
});
