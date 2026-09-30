import { useEffect } from "react";
import { View } from "react-native";

import { Badge } from "@/components/ui";
import { useAnalytics } from "@/hooks/use-analytics";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";

let trackedThisSession = false;

/**
 * Quiet notice above saved content while offline. Render it only when cached
 * data is on screen; with nothing to show the screen uses its error state.
 */
export function OfflineBanner({ inset = 0 }: { inset?: number }) {
  const analytics = useAnalytics();

  useEffect(() => {
    if (trackedThisSession) return;
    trackedThisSession = true;
    analytics.track(AnalyticsEvent.OFFLINE_BANNER_SHOWN, {});
  }, [analytics]);

  return (
    <View
      style={{ paddingHorizontal: inset, paddingBottom: 8 }}
      accessibilityRole="alert"
    >
      <Badge
        icon="offline"
        label="Offline, showing saved stories"
        surface="page"
      />
    </View>
  );
}
