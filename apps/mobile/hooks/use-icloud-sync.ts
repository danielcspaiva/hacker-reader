import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useEffectEvent } from "react";
import { AppState, Platform } from "react-native";

import { useAnalytics } from "@/hooks/use-analytics";
import { readICloudSyncStatus } from "@/hooks/use-icloud-sync-status";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import { hnKeys } from "@/lib/hn";
import { subscribeToStoreWrites } from "@/lib/hn/local/json-list-store";
import { reportError } from "@/lib/observability/report-error";
import { SYNCED_COLLECTIONS, type CollectionId } from "@/lib/sync/collections";
import { subscribeToSyncRequests } from "@/lib/sync/requests";
import { runICloudSync } from "@/lib/sync/run";
import { resetSyncBases } from "@/lib/sync/settings";
import { syncBookmarksWidget } from "@/lib/widgets/sync";
import { ICloudKVModule } from "@/modules/icloud-kv";

/** Local changes are batched: one sync per burst of edits. */
const DEBOUNCE_MS = 2000;

const SYNCED_STORAGE_KEYS: ReadonlySet<string> = new Set(
  SYNCED_COLLECTIONS.map((synced) => synced.storageKey)
);

let completedTracked = false;

/**
 * Syncs bookmarks, mutes, blocked users, hidden stories and read state through
 * iCloud (see `lib/sync/engine.ts`): on launch, on foreground, about 2s after
 * a local change, and when another device changes iCloud. Mount once in the
 * root layout. A no-op off iOS, when signed out of iCloud or when switched off.
 */
export function useICloudSync() {
  const queryClient = useQueryClient();
  const analytics = useAnalytics();
  // Reads the latest analytics without re-running the effect (and the sync).
  const trackCompleted = useEffectEvent(
    (result: NonNullable<Awaited<ReturnType<typeof runICloudSync>>>) =>
      analytics.track(AnalyticsEvent.ICLOUD_SYNC_COMPLETED, {
        [AnalyticsProperty.SYNC_PULLED_COUNT]: result.pulled,
        [AnalyticsProperty.SYNC_REMOVED_COUNT]: result.removed,
        [AnalyticsProperty.SYNC_PUSHED_COUNT]: result.pushed,
        [AnalyticsProperty.SYNC_TRIMMED_COUNT]: result.trimmed,
        [AnalyticsProperty.SYNC_PROBLEM_COUNT]: result.problems,
      })
  );

  useEffect(() => {
    if (Platform.OS !== "ios") return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let shrink = false;
    let stopped = false;

    const invalidate = (changed: CollectionId[]) => {
      const keys: Record<CollectionId, readonly unknown[]> = {
        bookmarks: hnKeys.bookmarks(),
        mutes: hnKeys.mutes(),
        blockedUsers: hnKeys.blockedUsers(),
        hidden: hnKeys.hidden(),
        readStories: hnKeys.readStories(),
      };
      for (const id of changed) {
        void queryClient.invalidateQueries({ queryKey: keys[id] });
      }
      if (changed.includes("bookmarks")) syncBookmarksWidget({ force: true });
    };

    const run = async () => {
      try {
        const status = await readICloudSyncStatus();
        if (stopped || !status.available || !status.enabled) return;
        const result = await runICloudSync({ shrink });
        if (!result) return;
        invalidate(result.changed);
        void queryClient.invalidateQueries({ queryKey: hnKeys.icloudSync() });
        // Sampled: once per session, however often sync runs.
        if (!completedTracked) {
          completedTracked = true;
          trackCompleted(result);
        }
      } catch (error) {
        reportError(error, { operation: "icloudSync" });
      }
    };

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void run(), DEBOUNCE_MS);
    };

    // Listener first, then the initial sync, so no external change is missed.
    const externalChanges = ICloudKVModule.addExternalChangeListener(
      async ({ reason }) => {
        if (reason === "quotaViolation") {
          shrink = true;
          reportError(new Error("iCloud key-value quota exceeded"), {
            operation: "icloudSync.quota",
          });
        } else if (reason === "accountChange") {
          // Another iCloud account: the stored state is not its history.
          try {
            await resetSyncBases();
          } catch (error) {
            reportError(error, { operation: "icloudSync.reset" });
          }
        }
        void run();
      }
    );
    const unsubscribeWrites = subscribeToStoreWrites((storageKey) => {
      if (SYNCED_STORAGE_KEYS.has(storageKey)) schedule();
    });
    const unsubscribeRequests = subscribeToSyncRequests(schedule);
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") void run();
    });

    void run();

    return () => {
      stopped = true;
      clearTimeout(timer);
      externalChanges.remove();
      unsubscribeWrites();
      unsubscribeRequests();
      appState.remove();
    };
  }, [queryClient]);
}
