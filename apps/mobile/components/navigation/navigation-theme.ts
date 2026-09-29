import { DarkTheme, DefaultTheme, type Theme } from "expo-router";

import { useTheme } from "@/hooks/use-theme";

/** React Navigation theme carrying the app's tokens. */
export function useNavigationTheme(): Theme {
  const { scheme, colors } = useTheme();
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.background,
      text: colors.foreground,
      border: colors.separator,
      notification: colors.primary,
    },
  };
}
