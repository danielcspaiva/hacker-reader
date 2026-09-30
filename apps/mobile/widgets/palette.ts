// The six tokens the widget layout reads, taken from the app theme. Widget layouts
// cannot import modules at runtime, so the palette travels to them as props data.
import { Colors, type ThemeColors } from "../constants/colors";

export type WidgetColors = Pick<
  ThemeColors,
  | "background"
  | "foreground"
  | "mutedForeground"
  | "tertiaryForeground"
  | "primary"
  | "primaryInk"
>;

function pick(colors: ThemeColors): WidgetColors {
  return {
    background: colors.background,
    foreground: colors.foreground,
    mutedForeground: colors.mutedForeground,
    tertiaryForeground: colors.tertiaryForeground,
    primary: colors.primary,
    primaryInk: colors.primaryInk,
  };
}

export const widgetPalette = {
  light: pick(Colors.light),
  dark: pick(Colors.dark),
};
