/**
 * Opens the story or digest a tapped push notification points to, from a cold start and
 * while the app runs. Foreground notifications are shown as banners.
 */

import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useRef } from "react";

import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import {
  isDigestTarget,
  parseNotificationTarget,
} from "@/lib/notifications/target";
import { reportError } from "@/lib/observability/report-error";

import { useAnalytics } from "./use-analytics";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Gives the root navigator a moment to mount when the app was launched by a tap. */
const COLD_START_DELAY_MS = 300;

export function useNotificationRouting() {
  const { track } = useAnalytics();
  // The same response can arrive from the cold-start lookup and the listener.
  const handled = useRef(new Set<string>());

  useEffect(() => {
    const open = (response: Notifications.NotificationResponse) => {
      if (
        response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER
      ) {
        return;
      }
      const { identifier, content } = response.notification.request;
      if (handled.current.has(identifier)) return;
      handled.current.add(identifier);

      const target = parseNotificationTarget(content.data);
      if (!target) return;

      track(AnalyticsEvent.NOTIFICATION_OPENED, {
        [AnalyticsProperty.NOTIFICATION_KIND]: target.kind,
      });
      try {
        if (isDigestTarget(target)) {
          router.push({
            pathname: "/digest/[date]",
            params: { date: target.date, source: "notification" },
          });
          return;
        }
        const id = String(target.storyId);
        if (target.commentId === undefined) {
          router.push({ pathname: "/story/[id]", params: { id } });
        } else {
          router.push({
            pathname: "/story/[id]",
            params: { id, commentId: String(target.commentId) },
          });
        }
      } catch (error) {
        reportError(error, { operation: "openNotification" });
      }
    };

    let timer: ReturnType<typeof setTimeout> | undefined;
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response)
          timer = setTimeout(() => open(response), COLD_START_DELAY_MS);
      })
      .catch((error: Error) =>
        reportError(error, { operation: "getLastNotificationResponse" })
      );
    const subscription =
      Notifications.addNotificationResponseReceivedListener(open);

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [track]);
}
