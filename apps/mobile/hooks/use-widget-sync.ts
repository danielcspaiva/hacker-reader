import { useEffect } from "react";
import { AppState, Platform } from "react-native";

import { syncTopStoriesWidget } from "@/lib/widgets/sync";

/**
 * Keeps the home screen widget timeline fresh on mount and on foreground. In
 * the background the widget extension refreshes itself (see
 * HNSelfRefreshingProvider).
 */
export function useWidgetSync() {
  useEffect(() => {
    if (Platform.OS !== "ios") return;

    syncTopStoriesWidget();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        syncTopStoriesWidget();
      }
    });
    return () => subscription.remove();
  }, []);
}
