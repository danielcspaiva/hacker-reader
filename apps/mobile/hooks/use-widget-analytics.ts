import * as Linking from "expo-linking";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import { parseWidgetTap } from "@/lib/widgets/tap";

import { useAnalytics } from "./use-analytics";

/** Tracks taps on widgets (story rows, headers and backgrounds), from a cold start and while running. */
export function useWidgetAnalytics() {
  const { track, isReady } = useAnalytics();
  const hasProcessedInitialUrl = useRef(false);

  useEffect(() => {
    if (!isReady || Platform.OS !== "ios") {
      return;
    }

    const handleUrl = (url: string) => {
      const tap = parseWidgetTap(url);
      if (!tap) return;

      track(AnalyticsEvent.WIDGET_TAPPED, {
        [AnalyticsProperty.WIDGET_SIZE]: tap.size,
        [AnalyticsProperty.WIDGET_KIND]: tap.kind,
        [AnalyticsProperty.CATEGORY]: tap.category,
        [AnalyticsProperty.STORY_ID]: tap.storyId,
      });
    };

    if (!hasProcessedInitialUrl.current) {
      hasProcessedInitialUrl.current = true;
      Linking.getInitialURL()
        .then((initialUrl) => {
          if (initialUrl) handleUrl(initialUrl);
        })
        .catch(() => {
          // No initial URL to read.
        });
    }

    const subscription = Linking.addEventListener("url", (event) => {
      handleUrl(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [isReady, track]);
}
