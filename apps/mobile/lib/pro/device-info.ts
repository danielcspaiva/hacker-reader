import { Platform } from "react-native";

import { APP_VERSION } from "@/constants/app-config";
import type { DevicePlatform } from "@/lib/pro/api";

/** The fields every device registration carries; null on platforms without Pro. */
export function deviceRegistrationBase() {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return null;
  const platform: DevicePlatform = Platform.OS;
  let timezone = "UTC";
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    // Keep UTC.
  }
  return { platform, appVersion: APP_VERSION, timezone };
}
