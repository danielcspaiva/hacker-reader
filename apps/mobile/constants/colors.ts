/**
 * Raw colour tokens: dependency-free (no React Native) so config plugins,
 * tests and the widget layout can import them. `constants/theme.ts` re-exports.
 * Light is warm "paper" after HN's classic #F6F6EF page; dark is a warm deep
 * charcoal-brown, not black. Contrast ratios are documented in
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
  /** HN orange: fills, tints, glyphs. Never small text on the page. */
  primary: string;
  /** Text and glyphs on a primary fill. */
  primaryForeground: string;
  /** Text-safe orange for links and small orange text (4.5:1). */
  primaryInk: string;
  primaryWash: string;
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
  background: "#FCFBF7",
  card: "#F4F2E9",
  cardPressed: "#EAE7DC",
  muted: "#E9E6DA",
  foreground: "#1F1B16",
  mutedForeground: "#6A645A",
  tertiaryForeground: "#8A8377",
  primary: "#FF6600",
  primaryForeground: "#1F1B16",
  primaryInk: "#B04400",
  primaryWash: "#FF660024",
  border: "#3C2D1424",
  separator: "#3C2D1418",
  success: "#2B7A33",
  warning: "#9A5B00",
  danger: "#C0311D",
  codeBackground: "#E9E6DA",
  rail: ["#F08A4B", "#F3A06D", "#F5B48E", "#F7C6AA", "#F9D5C1", "#FBE1D3"],
  tile: {
    orange: "#C24E00",
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
  primary: "#FF7A1F",
  primaryForeground: "#1A1208",
  primaryInk: "#FF8F45",
  primaryWash: "#FF7A1F2E",
  border: "#F3EDE324",
  separator: "#F3EDE31A",
  success: "#5DBB63",
  warning: "#E5A03A",
  danger: "#FF6B57",
  codeBackground: "#2D2721",
  rail: ["#C8651F", "#A85820", "#8B4B20", "#723F1E", "#5C351C", "#4A2D1A"],
  tile: {
    orange: "#FF8F45",
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
