/**
 * The "Notify me of replies" switch (Pro). Whether it is on is kept locally per
 * HN username; turning it on registers the push token and username with the
 * Pro API, turning it off (or signing out) clears them there.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Linking } from "react-native";

import { useHNAuth } from "@/contexts/hn-auth-context";
import { usePro } from "@/contexts/pro-context";
import { useAnalytics } from "@/hooks/use-analytics";
import { useProGate } from "@/hooks/use-pro-gate";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { hnKeys } from "@/lib/hn";
import {
  getReplyNotifications,
  setReplyNotifications,
} from "@/lib/hn/local/replies";
import { reportError } from "@/lib/observability/report-error";
import {
  disableReplyNotifications,
  enableReplyNotifications,
  type EnableResult,
} from "@/lib/pro/reply-notifications";

export const replyNotificationsOptions = {
  queryKey: hnKeys.replyNotifications(),
  queryFn: async () => {
    try {
      return await getReplyNotifications();
    } catch (error) {
      reportError(error, { operation: "getReplyNotifications" });
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
      "Allow notifications for Hacker Reader in Settings to get a push when someone replies.",
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

export function useReplyNotifications() {
  const { username, isAuthenticated } = useHNAuth();
  const { isPro } = usePro();
  const { requirePro } = useProGate();
  const { track } = useAnalytics();
  const queryClient = useQueryClient();
  const { data: entries } = useQuery(replyNotificationsOptions);

  const setStored = (next: { username: string }[]) =>
    queryClient.setQueryData(hnKeys.replyNotifications(), next);

  const enableMutation = useMutation({
    mutationFn: async (user: string) => {
      const result = await enableReplyNotifications(user);
      if (result.ok) await setReplyNotifications(user);
      return result;
    },
    onSuccess: (result, user) => {
      if (result.ok) {
        setStored([{ username: user }]);
        track(AnalyticsEvent.REPLY_NOTIFICATIONS_ENABLED, {});
      } else {
        explainFailure(result.reason);
      }
    },
    onError: (error) => {
      reportError(error, { operation: "enableReplyNotifications" });
      explainFailure("unavailable");
    },
  });

  const disableMutation = useMutation({
    mutationFn: async () => {
      // Local first: the switch must flip even when the server is unreachable.
      await setReplyNotifications(null);
      setStored([]);
      await disableReplyNotifications();
    },
    onSuccess: () => track(AnalyticsEvent.REPLY_NOTIFICATIONS_DISABLED, {}),
    onError: (error) =>
      reportError(error, { operation: "disableReplyNotifications" }),
  });

  const isOn =
    isPro &&
    isAuthenticated &&
    !!username &&
    !!entries?.some((entry) => entry.username === username);

  /** Local opt-in only, for "Delete Pro Data" (the server side is deleted there). */
  const forget = async () => {
    await setReplyNotifications(null);
    setStored([]);
  };

  return {
    forget,
    /** Signed in: the switch only makes sense then. */
    isAvailable: isAuthenticated && !!username,
    isOn,
    isBusy: enableMutation.isPending || disableMutation.isPending,
    setOn: (next: boolean) => {
      if (!username) return;
      if (!next) {
        disableMutation.mutate();
        return;
      }
      if (!requirePro("reply_notifications")) return;
      enableMutation.mutate(username);
    },
  };
}
