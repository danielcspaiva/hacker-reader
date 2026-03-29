import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { Colors } from "./theme";

type ColorPalette = keyof (typeof Colors)["dark"];

/**
 * Build a navigation theme that follows the app's color scheme and palette.
 */
export function buildNavigationTheme(
  colorScheme: "light" | "dark",
  colorPalette: ColorPalette
) {
  if (colorScheme === "dark") {
    return {
      ...DarkTheme,
      colors: {
        ...DarkTheme.colors,
        background: Colors.dark[colorPalette].background,
        card: Colors.dark[colorPalette].background,
        text: Colors.dark[colorPalette].text,
        border: Colors.dark[colorPalette].border,
      },
    };
  }

  return {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: Colors.light[colorPalette].background,
      card: Colors.light[colorPalette].background,
      text: Colors.light[colorPalette].text,
      border: Colors.light[colorPalette].border,
    },
  };
}
