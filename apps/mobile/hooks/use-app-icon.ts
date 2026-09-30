/**
 * The home screen icon: what is active, whether this device can switch, and
 * `selectIcon`. Alternate icons are a cosmetic Pro supporter perk (the one
 * exception to "never gate client-only features"): picking a non-default icon
 * goes through the paywall, going back to Default never does. If Pro lapses the
 * chosen icon stays; nothing here resets it.
 */

import { useFocusEffect } from "expo-router";
import { useState } from "react";
import { Alert, Platform } from "react-native";

import { usePro } from "@/contexts/pro-context";
import { useAnalytics } from "@/hooks/use-analytics";
import { useProGate } from "@/hooks/use-pro-gate";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import {
  appIconFromNativeName,
  appIconOption,
  isGatedAppIcon,
  type AppIconId,
} from "@/lib/app-icons/icons";
import { hapticNotify, Haptics } from "@/lib/haptics";
import { reportError } from "@/lib/observability/report-error";

type AlternateIcons = typeof import("expo-alternate-app-icons");

/** iOS only, and null when the native module is missing (Expo Go, old dev build). */
function loadAlternateIcons(): AlternateIcons | null {
  if (Platform.OS !== "ios") return null;
  try {
    // SAFETY: the module exports exactly the types of `AlternateIcons`.
    return require("expo-alternate-app-icons") as AlternateIcons;
  } catch {
    return null;
  }
}

const alternateIcons = loadAlternateIcons();

function readActiveIcon(): AppIconId {
  try {
    return appIconFromNativeName(alternateIcons?.getAppIconName());
  } catch {
    return "default";
  }
}

export function useAppIcon() {
  const { isPro } = usePro();
  const { requirePro } = useProGate();
  const analytics = useAnalytics();
  const [current, setCurrent] = useState<AppIconId>(readActiveIcon);

  // Another screen may have changed it while this one stayed mounted.
  useFocusEffect(() => {
    setCurrent(readActiveIcon());
  });

  const supported = alternateIcons?.supportsAlternateIcons === true;

  /** Resolves true when the icon was changed. */
  const selectIcon = async (id: AppIconId): Promise<boolean> => {
    if (!alternateIcons || id === current) return false;
    if (isGatedAppIcon(id) && !requirePro("alternate_icons")) return false;
    try {
      await alternateIcons.setAlternateAppIcon(appIconOption(id).nativeName);
      setCurrent(id);
      hapticNotify(Haptics.NotificationFeedbackType.Success);
      analytics.track(AnalyticsEvent.APP_ICON_CHANGED, {
        [AnalyticsProperty.APP_ICON]: id,
        [AnalyticsProperty.IS_PRO]: isPro,
      });
      return true;
    } catch (error) {
      reportError(error, { operation: "appIcon.set", icon: id });
      Alert.alert("Could not change the icon", "Please try again in a moment.");
      return false;
    }
  };

  return { supported, current, selectIcon };
}
