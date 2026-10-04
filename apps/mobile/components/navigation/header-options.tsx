import type { Stack } from "expo-router";
import type { ComponentProps } from "react";
import { Platform } from "react-native";

import { ModalCloseButton } from "@/components/navigation/modal-close-button";
import type { ThemeColors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useWideLayout } from "@/hooks/use-wide-layout";

type StackScreenOptions = Extract<
  NonNullable<ComponentProps<typeof Stack>["screenOptions"]>,
  object
>;

/**
 * - `large`: tab roots, native large title.
 * - `inline`: detail screens, small title.
 * - `sheet`: modal flows, opaque bar with a grabber and a close button.
 */
export type HeaderVariant = "large" | "inline" | "sheet";

/**
 * Header chrome per platform. iOS 26 draws Liquid Glass only when the bar is
 * transparent and has no `headerBlurEffect`; content starts below it through
 * `contentInsetAdjustmentBehavior="automatic"` on the scroll view. Android has
 * no such inset, so it gets an opaque bar in the page colour.
 */
function headerOptions(
  colors: ThemeColors,
  variant: HeaderVariant
): StackScreenOptions {
  const shared = {
    headerShadowVisible: false,
    headerTintColor: colors.primary,
    headerTitleStyle: { color: colors.foreground },
    headerBackButtonDisplayMode: "minimal",
    // The chevron shows no text, but VoiceOver reads this title; without it
    // iOS 26 falls back to the previous route's name, e.g. "(tabs)".
    headerBackTitle: "Back",
    contentStyle: { backgroundColor: colors.background },
  } as const;

  if (variant === "sheet") {
    return {
      ...shared,
      presentation: Platform.OS === "ios" ? "formSheet" : "modal",
      sheetGrabberVisible: true,
      headerShown: true,
      headerTransparent: false,
      headerStyle: { backgroundColor: colors.background },
      headerRight: () => <ModalCloseButton />,
    };
  }

  if (Platform.OS !== "ios") {
    return {
      ...shared,
      headerStyle: { backgroundColor: colors.background },
      headerTitleAlign: "left",
    };
  }

  return {
    ...shared,
    headerLargeTitle: variant === "large",
    headerLargeTitleShadowVisible: false,
    headerLargeTitleStyle: { color: colors.foreground },
    headerTransparent: true,
    headerStyle: { backgroundColor: "transparent" },
    headerLargeStyle: { backgroundColor: "transparent" },
  };
}

/** Shared header options for a route declared on any Stack. */
export function useHeaderOptions(variant: HeaderVariant) {
  const { colors } = useTheme();
  return headerOptions(colors, variant);
}

/**
 * List-and-detail screens. A window-level large title draws across both
 * columns, so on a wide iOS window the window bar is hidden and the list
 * column owns the large title (`ListColumn`), which is what iOS 26 turns into
 * Liquid Glass. Android keeps this window bar and its title. Hiding it there
 * leaves a blank bar (the toolbar forces `headerShown` back on) plus the
 * column's own title.
 */
export function useSplitHeaderOptions(title: string): StackScreenOptions {
  const base = useHeaderOptions("large");
  const wide = useWideLayout();
  if (wide && Platform.OS === "ios") {
    return {
      ...base,
      title: "",
      headerTitle: "",
      headerShown: false,
      headerLargeTitle: false,
    };
  }
  return { ...base, title, headerShown: true, headerLargeTitle: true };
}
