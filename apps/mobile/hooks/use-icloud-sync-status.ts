/** iCloud sync preference and status for the Settings screen. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAnalytics } from "@/hooks/use-analytics";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import { hnKeys } from "@/lib/hn";
import { reportError } from "@/lib/observability/report-error";
import { requestICloudSync } from "@/lib/sync/requests";
import {
  getICloudSyncPreference,
  getLastSyncedAt,
  setICloudSyncPreference,
} from "@/lib/sync/settings";
import { ICloudKVModule } from "@/modules/icloud-kv";

export interface ICloudSyncStatus {
  /** Signed in to iCloud (and on iOS with the native module). */
  available: boolean;
  /** The switch: on by default when iCloud is available. */
  enabled: boolean;
  lastSyncedAt: number | null;
}

export async function readICloudSyncStatus(): Promise<ICloudSyncStatus> {
  const [preference, lastSyncedAt] = await Promise.all([
    getICloudSyncPreference(),
    getLastSyncedAt(),
  ]);
  return {
    available: ICloudKVModule.isAvailable(),
    enabled: preference ?? true,
    lastSyncedAt,
  };
}

export function useICloudSyncStatus() {
  const queryClient = useQueryClient();
  const analytics = useAnalytics();

  const { data } = useQuery({
    queryKey: hnKeys.icloudSync(),
    queryFn: readICloudSyncStatus,
    staleTime: 0,
    retry: false,
  });

  const toggleMutation = useMutation({
    mutationFn: setICloudSyncPreference,
    onSuccess: (_, enabled) => {
      analytics.track(AnalyticsEvent.ICLOUD_SYNC_TOGGLED, {
        [AnalyticsProperty.SYNC_ENABLED]: enabled,
      });
      void queryClient.invalidateQueries({ queryKey: hnKeys.icloudSync() });
      if (enabled) requestICloudSync();
    },
    onError: (error) => reportError(error, { operation: "icloudSync.toggle" }),
  });

  return {
    available: data?.available ?? false,
    enabled: data?.enabled ?? false,
    lastSyncedAt: data?.lastSyncedAt ?? null,
    isLoaded: data !== undefined,
    setEnabled: toggleMutation.mutate,
  };
}
