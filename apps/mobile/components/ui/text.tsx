import {
  StyleSheet,
  Text as RNText,
  type TextProps as RNTextProps,
} from "react-native";

import { Fonts, type ThemeColors } from "@/constants/theme";
import { useTextSize } from "@/contexts/text-size-context";
import { useTheme } from "@/hooks/use-theme";
import { scaleFont } from "@/lib/text/text-size";

/**
 * Type scale sized to iOS text styles (Large Title, Title 2, Headline, Body,
 * Subheadline, Footnote, Caption 2) in the system font. Scales with Dynamic Type.
 */
export type TextVariant =
  | "hero"
  | "display"
  | "headline"
  | "title"
  | "subtitle"
  | "body"
  | "callout"
  | "caption"
  | "label";

export type TextTone =
  | "default"
  | "muted"
  | "tertiary"
  | "primary"
  | "destructive"
  | "success"
  | "warning";

export type TextWeight = "regular" | "medium" | "semibold" | "bold";

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
  /** Overrides the variant's weight. */
  weight?: TextWeight;
  /** Tabular figures for counts and scores. Default on for `hero`. */
  numeric?: boolean;
  /** New York serif (iOS). For story titles on the detail hero. */
  serif?: boolean;
  /**
   * Follows the Text Size setting (size and line height). For reading content:
   * story titles, story text, comment bodies. Not for chrome. Stacks on top of
   * iOS Dynamic Type.
   */
  scalable?: boolean;
}

const WEIGHT = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

const styles = StyleSheet.create({
  hero: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: WEIGHT.bold,
    letterSpacing: -0.8,
    fontVariant: ["tabular-nums"],
  },
  display: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: WEIGHT.bold,
    letterSpacing: -0.6,
  },
  headline: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: WEIGHT.bold,
    letterSpacing: -0.4,
  },
  title: { fontSize: 22, lineHeight: 28, fontWeight: WEIGHT.bold },
  subtitle: { fontSize: 17, lineHeight: 22, fontWeight: WEIGHT.semibold },
  body: { fontSize: 17, lineHeight: 22, fontWeight: WEIGHT.regular },
  callout: { fontSize: 15, lineHeight: 20, fontWeight: WEIGHT.regular },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: WEIGHT.regular },
  label: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: WEIGHT.semibold,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  numeric: { fontVariant: ["tabular-nums"] },
  serif: { fontFamily: Fonts?.serif },
});

const TONE_COLOR = {
  default: "foreground",
  muted: "mutedForeground",
  tertiary: "tertiaryForeground",
  primary: "primaryInk",
  destructive: "danger",
  success: "success",
  warning: "warning",
} as const satisfies Record<TextTone, keyof ThemeColors>;

export function Text({
  variant = "body",
  tone = "default",
  weight,
  numeric,
  serif,
  scalable,
  style,
  ...rest
}: TextProps) {
  const { colors } = useTheme();
  const { scale } = useTextSize();
  const metrics =
    scalable && scale !== 1 ? StyleSheet.flatten(styles[variant]) : null;
  return (
    <RNText
      style={[
        styles[variant],
        metrics
          ? {
              fontSize: scaleFont(metrics.fontSize ?? 17, scale),
              lineHeight:
                metrics.lineHeight === undefined
                  ? undefined
                  : scaleFont(metrics.lineHeight, scale),
            }
          : null,
        numeric ? styles.numeric : null,
        serif ? styles.serif : null,
        weight ? { fontWeight: WEIGHT[weight] } : null,
        { color: colors[TONE_COLOR[tone]] },
        style,
      ]}
      {...rest}
    />
  );
}
