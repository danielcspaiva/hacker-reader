import { Colors } from "@/constants/theme";
import { useColorSchemeContext } from "@/contexts/color-scheme-context";
import { useThemeColor } from "@/hooks/use-theme-color";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack } from "expo-router";
import type { ReactNode } from "react";

/**
 * Shared native Stack for the large-title tab screens (Feed, Bookmarks, Profile,
 * Settings, Search). Centralizes the transparent large-title header, blur, and theme
 * tint that were previously copy-pasted across five near-identical `_layout.tsx` files.
 *
 * Each tab layout now only declares its screen title (and any screen-specific options,
 * e.g. the search bar) via `Stack.Screen` children passed through to this component.
 *
 * `headerTransparent` defaults to `isLiquidGlassAvailable()` — the value the
 * Form-based screens (Profile, Settings, Search) were tuned for, where an opaque
 * header on pre-iOS-26 keeps the first section clear of the header. Feed/Bookmarks
 * pass `headerTransparent` to always float over their lists.
 */
export function LargeTitleStack({
  children,
  headerTransparent = isLiquidGlassAvailable(),
}: {
  children?: ReactNode;
  headerTransparent?: boolean;
}) {
  const { colorScheme, colorPalette } = useColorSchemeContext();
  const tintColor = useThemeColor({}, "tint");
  const backgroundColor =
    colorScheme === "dark"
      ? Colors.dark[colorPalette].background
      : Colors.light[colorPalette].background;

  return (
    <Stack
      screenOptions={{
        headerTransparent,
        headerLargeTitle: true,
        headerLargeTitleShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        headerTintColor: tintColor,
        headerLargeTitleStyle: { color: tintColor },
        headerBlurEffect: isLiquidGlassAvailable() ? "none" : "systemMaterial",
        headerStyle: {
          backgroundColor: isLiquidGlassAvailable()
            ? "transparent"
            : backgroundColor,
        },
      }}
    >
      {children}
    </Stack>
  );
}
