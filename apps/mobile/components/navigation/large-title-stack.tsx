import { Stack } from "expo-router";
import type { ReactNode } from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useHeaderOptions } from "@/components/navigation/header-options";

const IOS_NAV_BAR_HEIGHT = 44;

/**
 * How far a screen that draws its own fixed chrome (no scroll view to inset)
 * must push content down to clear the transparent iOS header.
 */
export function useHeaderOverlapInset() {
  const insets = useSafeAreaInsets();
  return Platform.OS === "ios" ? insets.top + IOS_NAV_BAR_HEIGHT : 0;
}

/** Stack for the tab screens: large title, transparent glass header. */
export function LargeTitleStack({ children }: { children?: ReactNode }) {
  return <Stack screenOptions={useHeaderOptions("large")}>{children}</Stack>;
}
