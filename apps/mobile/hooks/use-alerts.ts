/**
 * Keyword alerts (Pro): the local list plus add/remove. Adding goes through the
 * Pro gate, asks for notification permission, gets the push token and registers
 * the list with the server; removing updates the local list first and then the
 * server copy (a failed sync is retried on the next launch).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert as RNAlert, Linking } from "react-native";

import { useAnalytics } from "@/hooks/use-analytics";
import { useProGate } from "@/hooks/use-pro-gate";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import {
  MAX_ALERTS,
  hnKeys,
  isSiteQuery,
  withAlert,
  type Alert,
  type AlertKind,
  type AlertMinPoints,
} from "@/lib/hn";
import {
  addAlert,
  clearAlerts,
  getAlerts,
  removeAlert,
} from "@/lib/hn/local/alerts";
import { reportError } from "@/lib/observability/report-error";
import { enableAlerts, syncAlerts } from "@/lib/pro/alerts";
import { ProApiError } from "@/lib/pro/api";
import type { EnableResult } from "@/lib/pro/reply-notifications";

export const alertsOptions = {
  queryKey: hnKeys.alerts(),
  queryFn: async () => {
    try {
      return await getAlerts();
    } catch (error) {
      reportError(error, { operation: "getAlerts" });
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
    RNAlert.alert(
      "Notifications are off",
      "Allow notifications for Hacker Reader in Settings to get a push when a story matches an alert.",
      [
        { text: "Not now", style: "cancel" },
        { text: "Open Settings", onPress: () => void Linking.openSettings() },
      ]
    );
  } else {
    RNAlert.alert(
      "Can't set up alerts",
      reason === "no_project_id"
        ? "This build has no Expo project id, so it cannot get a push token."
        : "Alerts are not available right now. Try again later."
    );
  }
}

export interface NewAlert {
  kind: AlertKind;
  text: string;
  minPoints: AlertMinPoints;
}

type AddOutcome =
  | { status: "added"; alerts: Alert[] }
  | { status: "rejected"; reason: "invalid" | "limit" | "duplicate" }
  | {
      status: "push_failed";
      reason: Extract<EnableResult, { ok: false }>["reason"];
    };

export function useAlerts() {
  const queryClient = useQueryClient();
  const { track } = useAnalytics();
  const { requirePro } = useProGate();
  const { data: alerts = [], isLoading } = useQuery(alertsOptions);

  const setStored = (next: Alert[]) =>
    queryClient.setQueryData(hnKeys.alerts(), next);

  const addMutation = useMutation({
    mutationFn: async (input: NewAlert): Promise<AddOutcome> => {
      const current = await getAlerts();
      // Validate and check the limit before asking for permission.
      const preview = withAlert(current, input);
      if (!preview.ok) return { status: "rejected", reason: preview.reason };
      const registered = await enableAlerts(preview.alerts);
      if (!registered.ok) {
        return { status: "push_failed", reason: registered.reason };
      }
      // Stored after the server accepted it, so the two lists stay equal.
      const stored = await addAlert(input);
      return stored.ok
        ? { status: "added", alerts: stored.alerts }
        : { status: "rejected", reason: stored.reason };
    },
    onSuccess: (outcome, input) => {
      if (outcome.status === "added") {
        setStored(outcome.alerts);
        track(AnalyticsEvent.ALERT_ADDED, {
          [AnalyticsProperty.ALERT_HAS_SITE]: isSiteQuery(
            outcome.alerts[outcome.alerts.length - 1]?.query ?? ""
          ),
          [AnalyticsProperty.SEARCH_MIN_POINTS]: input.minPoints,
        });
      } else if (outcome.status === "push_failed") {
        explainFailure(outcome.reason);
      } else if (outcome.reason === "limit") {
        RNAlert.alert(
          "Alert limit reached",
          `You can have up to ${MAX_ALERTS} alerts. Remove one to add another.`
        );
      } else if (outcome.reason === "duplicate") {
        RNAlert.alert("Already added", "You already have this alert.");
      }
    },
    onError: (error) => {
      reportError(error, { operation: "addAlert" });
      explainFailure("unavailable");
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      // Local first: the row must go even when the server is unreachable.
      const next = await removeAlert(id);
      setStored(next);
      try {
        await syncAlerts(next);
      } catch (error) {
        // Not Pro any more (402): the server stops pushing by itself.
        if (!(error instanceof ProApiError && error.status === 402)) {
          reportError(error, { operation: "syncAlerts" });
        }
      }
    },
    onSuccess: () => track(AnalyticsEvent.ALERT_REMOVED, {}),
    onError: (error) => reportError(error, { operation: "removeAlert" }),
  });

  /** Local list only, for "Delete Pro Data" (the server side is deleted there). */
  const forget = async () => {
    await clearAlerts();
    setStored([]);
  };

  return {
    alerts,
    isLoading,
    isBusy: addMutation.isPending || removeMutation.isPending,
    forget,
    /** Resolves to true when the alert was added. Gated behind Pro. */
    add: async (input: NewAlert): Promise<boolean> => {
      if (!requirePro("keyword_alerts")) return false;
      const outcome = await addMutation.mutateAsync(input).catch(() => null);
      return outcome?.status === "added";
    },
    remove: (id: string) => removeMutation.mutateAsync(id).catch(() => {}),
  };
}
