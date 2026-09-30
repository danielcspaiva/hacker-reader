import { useEffect } from "react";
import { AppState, Platform } from "react-native";

import { syncBookmarksWidget, syncTopStoriesWidget } from "@/lib/widgets/sync";

/**
 * Keeps the home screen widget timelines (Top Stories and Bookmarks) fresh on mount and on foreground. In
 * the background the widget extension refreshes itself (see
 * HNSelfRefreshingProvider).
 */
export function useWidgetSync() {
  useEffect(() => {
    if (Platform.OS !== "ios") return;

    const syncAll = () => {
      syncTopStoriesWidget();
      syncBookmarksWidget();
    };
    syncAll();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") syncAll();
    });
    return () => subscription.remove();
  }, []);
}
