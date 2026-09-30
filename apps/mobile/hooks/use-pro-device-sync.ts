import { useEffect, type RefObject } from "react";
import { AppState, Platform } from "react-native";

import { APP_VERSION } from "@/constants/app-config";
import { reportError } from "@/lib/observability/report-error";
import { proApi } from "@/lib/pro/api";
import { getInstallId } from "@/lib/pro/install-id";

/** Re-registering more often than this adds nothing the server needs. */
const MIN_INTERVAL_MS = 5 * 60 * 1000;

function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Registers this device (platform, app version, time zone) with the Pro API on
 * launch and on foreground, fire-and-forget. Only for Pro users: a free install
 * sends nothing to the API. `paused` stops it for the session after the user
 * deleted their Pro data.
 */
export function useProDeviceSync(enabled: boolean, paused: RefObject<boolean>) {
  useEffect(() => {
    if (!enabled || !proApi.isConfigured) return;
    if (Platform.OS !== "ios" && Platform.OS !== "android") return;
    const platform = Platform.OS;

    let lastRegisteredAt = 0;
    const register = () => {
      if (paused.current) return;
      if (Date.now() - lastRegisteredAt < MIN_INTERVAL_MS) return;
      lastRegisteredAt = Date.now();
      getInstallId()
        .then((installId) =>
          proApi.registerDevice(installId, {
            platform,
            appVersion: APP_VERSION,
            timezone: deviceTimezone(),
          })
        )
        .catch((error: Error) =>
          reportError(error, { operation: "registerProDevice" })
        );
    };

    register();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") register();
    });
    return () => subscription.remove();
  }, [enabled, paused]);
}
