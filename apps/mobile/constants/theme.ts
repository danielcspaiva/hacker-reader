import { Platform } from "react-native";

import type { ColorScheme, ThemeColors } from "./colors";

export { Colors } from "./colors";
export type { ColorScheme, ThemeColors, TileHue } from "./colors";

export interface Theme {
  scheme: ColorScheme;
  colors: ThemeColors;
}

/** Alpha of the tinted washes drawn from a solid token. */
export const WashAlpha = {
  /** Soft `Badge` fill. */
  badge: 0.16,
  /** Destructive `Button` fill. */
  destructive: 0.14,
  /** `IconTile` fill in light and dark. */
  tileLight: 0.14,
  tileDark: 0.2,
} as const;

/** Appends an alpha channel to a #RRGGBB colour. */
export function withAlpha(color: string, alpha: number): string {
  const channel = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${color.slice(0, 7)}${channel}`;
}

export const Radius = {
  /** Buttons, fields. */
  control: 12,
  /** ListSection. */
  list: 20,
  /** Card. */
  card: 24,
  pill: 999,
} as const;

/** Vertical gap between stacked cards in lists. */
export const CARD_GAP = 8;

/** Horizontal page gutter. */
export const GUTTER = 16;

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
