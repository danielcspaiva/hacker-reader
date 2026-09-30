/**
 * Raw colour tokens: dependency-free (no React Native) so config plugins,
 * tests and the widget layout can import them. `constants/theme.ts` re-exports.
 * Light is white cards on a warm grey page; dark is a warm deep
 * charcoal-brown, not black. The accent is the app icon's orange. Contrast ratios are documented in
 * docs/design-language.md.
 */
export interface ThemeColors {
  /** Page. */
  background: string;
  /** Solid content surface, a small lightness step from the page. */
  card: string;
  /** Pressed fill for rows and cards. */
  cardPressed: string;
  /** Quiet fill: tracks, chips, skeletons, icon buttons. */
  muted: string;
  foreground: string;
  mutedForeground: string;
  /** Decorative and non-essential text only (3:1). */
  tertiaryForeground: string;
  /** The app icon's orange: fills, tints, glyphs. Never small text on the page. */
  primary: string;
  /** Text and glyphs on a primary fill. */
  primaryForeground: string;
  /** Text-safe orange for links and small orange text (4.5:1). */
  primaryInk: string;
  primaryWash: string;
  /** Feed rank numerals: the darker orange from the back of the app icon's book. */
  rank: string;
  /** Outlines: fields, chips. */
  border: string;
  /** Hairline between rows. */
  separator: string;
  success: string;
  warning: string;
  danger: string;
  codeBackground: string;
  /** Comment thread depth rails: one orange, strongest at the top level and
   * receding with depth; index by depth % length. */
  rail: readonly [string, string, string, string, string, string];
  /** Icon tile hues: glyph colour, washed by IconTile. */
  tile: Record<TileHue, string>;
}

export type TileHue =
  | "orange"
  | "blue"
  | "green"
  | "red"
  | "indigo"
  | "gray"
  | "teal"
  | "amber"
  | "pink";

export type ColorScheme = "light" | "dark";

/** Keys of `ThemeColors` that hold a single colour string. */

const light: ThemeColors = {
  background: "#F4F0EC",
  card: "#FFFFFF",
  cardPressed: "#F6F3F0",
  muted: "#EDE9E3",
  foreground: "#1F1B16",
  mutedForeground: "#6A645A",
  tertiaryForeground: "#8A8377",
  primary: "#FF7A18",
  primaryForeground: "#1F1B16",
  primaryInk: "#A84700",
  primaryWash: "#FF7A1824",
  rank: "#F46911",
  border: "#3C2D1424",
  separator: "#3C2D1418",
  success: "#2B7A33",
  warning: "#9A5B00",
  danger: "#C0311D",
  codeBackground: "#EDE9E3",
  rail: ["#F0914B", "#F3A66D", "#F5BA8E", "#F7CBAA", "#F9D9C1", "#FBE4D3"],
  tile: {
    orange: "#C25200",
    blue: "#1F5FBF",
    green: "#2A7D36",
    red: "#C0311D",
    indigo: "#4B47B8",
    gray: "#6A645A",
    teal: "#12796E",
    amber: "#8F5E00",
    pink: "#B5306F",
  },
};

const dark: ThemeColors = {
  background: "#17130F",
  card: "#272119",
  cardPressed: "#2F2820",
  muted: "#2D2721",
  foreground: "#F3EDE3",
  mutedForeground: "#A9A194",
  tertiaryForeground: "#857D70",
  primary: "#FF7A18",
  primaryForeground: "#1A1208",
  primaryInk: "#FF8F3D",
  primaryWash: "#FF7A182E",
  rank: "#F46911",
  border: "#F3EDE324",
  separator: "#F3EDE31A",
  success: "#5DBB63",
  warning: "#E5A03A",
  danger: "#FF6B57",
  codeBackground: "#2D2721",
  rail: ["#C8671F", "#A85A20", "#8B4D20", "#72421E", "#5C371C", "#4A2E1A"],
  tile: {
    orange: "#FF8F3D",
    blue: "#6AA8FF",
    green: "#5DBB63",
    red: "#FF6B57",
    indigo: "#8E8CFF",
    gray: "#A9A194",
    teal: "#3FC1B0",
    amber: "#E5A03A",
    pink: "#FF7AB0",
  },
};

export const Colors: Record<ColorScheme, ThemeColors> = { light, dark };
