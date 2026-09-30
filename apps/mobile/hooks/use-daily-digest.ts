/**
 * The "Daily digest" switch and delivery hour (Pro). Both are kept locally;
 * turning it on registers the push token and `prefs.digest` with the Pro API,
 * turning it off clears them there.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Linking } from "react-native";

import { usePro } from "@/contexts/pro-context";
import { useAnalytics } from "@/hooks/use-analytics";
import { useProGate } from "@/hooks/use-pro-gate";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import { hnKeys } from "@/lib/hn";
import type { DigestSettingsEntry } from "@/lib/hn/digest";
import { getDigestSettings, setDigestSettings } from "@/lib/hn/local/digest";
import { reportError } from "@/lib/observability/report-error";
import {
  disableDailyDigest,
  enableDailyDigest,
  updateDailyDigestHour,
} from "@/lib/pro/daily-digest";
import { DEFAULT_DIGEST_HOUR } from "@/lib/pro/digest";
import type { EnableResult } from "@/lib/pro/reply-notifications";

export const dailyDigestOptions = {
  queryKey: hnKeys.dailyDigest(),
  queryFn: async () => {
    try {
      return await getDigestSettings();
    } catch (error) {
      reportError(error, { operation: "getDigestSettings" });
      throw error;
    }
  },
  staleTime: Number.POSITIVE_INFINITY, // local data: only our own mutations change it
  retry: false,
} as const;

function explainFailure(
  reason: Extract<EnableResult, { ok: false }>["reason"]
) {
  if (reason === "denied") {
    Alert.alert(
      "Notifications are off",
      "Allow notifications for Hacker Reader in Settings to get the daily digest.",
      [
        { text: "Not now", style: "cancel" },
        { text: "Open Settings", onPress: () => void Linking.openSettings() },
      ]
    );
  } else {
    Alert.alert(
      "Can't set up notifications",
      reason === "no_project_id"
        ? "This build has no Expo project id, so it cannot get a push token."
        : "Push notifications are not available right now. Try again later."
    );
  }
}

export function useDailyDigest() {
  const { isPro } = usePro();
  const { requirePro } = useProGate();
  const { track } = useAnalytics();
  const queryClient = useQueryClient();
  const { data: entries } = useQuery(dailyDigestOptions);
  const stored = entries?.[0];

  const setStored = (next: DigestSettingsEntry | null) =>
    queryClient.setQueryData(hnKeys.dailyDigest(), next ? [next] : []);

  const enableMutation = useMutation({
    mutationFn: async (hour: number) => {
      const result = await enableDailyDigest(hour);
      if (result.ok) await setDigestSettings({ enabled: true, hour });
      return result;
    },
    onSuccess: (result, hour) => {
      if (result.ok) {
        setStored({ enabled: true, hour });
        track(AnalyticsEvent.DIGEST_ENABLED, {
          [AnalyticsProperty.DIGEST_HOUR]: hour,
        });
      } else {
        explainFailure(result.reason);
      }
    },
    onError: (error) => {
      reportError(error, { operation: "enableDailyDigest" });
      explainFailure("unavailable");
    },
  });

  const disableMutation = useMutation({
    mutationFn: async () => {
      // Local first: the switch must flip even when the server is unreachable.
      await setDigestSettings(null);
      setStored(null);
      await disableDailyDigest();
    },
    onSuccess: () => track(AnalyticsEvent.DIGEST_DISABLED, {}),
    onError: (error) => reportError(error, { operation: "disableDailyDigest" }),
  });

  const hourMutation = useMutation({
    mutationFn: async (hour: number) => {
      await updateDailyDigestHour(hour);
      await setDigestSettings({ enabled: true, hour });
      return hour;
    },
    onSuccess: (hour) => setStored({ enabled: true, hour }),
    onError: (error) => {
      reportError(error, { operation: "updateDailyDigestHour" });
      Alert.alert("Couldn't change the time", "Please try again in a moment.");
    },
  });

  const isOn = isPro && stored?.enabled === true;
  const hour = stored?.hour ?? DEFAULT_DIGEST_HOUR;

  /** Local opt-in only, for "Delete Pro Data" (the server side is deleted there). */
  const forget = async () => {
    await setDigestSettings(null);
    setStored(null);
  };

  return {
    forget,
    isOn,
    hour,
    isBusy:
      enableMutation.isPending ||
      disableMutation.isPending ||
      hourMutation.isPending,
    setOn: (next: boolean) => {
      if (!next) {
        disableMutation.mutate();
        return;
      }
      if (!requirePro("daily_digest")) return;
      enableMutation.mutate(hour);
    },
    setHour: (next: number) => {
      if (next === hour) return;
      if (isOn) hourMutation.mutate(next);
      else {
        // Off: remember the choice for when it is switched on.
        void setDigestSettings({ enabled: false, hour: next })
          .then(() => setStored({ enabled: false, hour: next }))
          .catch((error: Error) =>
            reportError(error, { operation: "setDigestHour" })
          );
      }
    },
  };
}
