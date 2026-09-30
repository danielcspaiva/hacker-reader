import { useState } from "react";
import { Alert } from "react-native";

import { usePro } from "@/contexts/pro-context";
import { useAnalytics } from "@/hooks/use-analytics";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { hapticNotify, Haptics } from "@/lib/haptics";
import { reportError } from "@/lib/observability/report-error";

/** Restore Purchases with feedback, for the paywall and Settings. */
export function useRestorePurchases() {
  const { restore } = usePro();
  const analytics = useAnalytics();
  const [isRestoring, setIsRestoring] = useState(false);

  const restorePurchases = async () => {
    setIsRestoring(true);
    try {
      const isPro = await restore();
      analytics.track(AnalyticsEvent.PURCHASE_RESTORED, { is_pro: isPro });
      if (isPro) {
        hapticNotify(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Purchases restored", "Hacker Reader Pro is active.");
      } else {
        Alert.alert(
          "Nothing to restore",
          "We could not find an active Pro subscription for this Apple ID."
        );
      }
    } catch (error) {
      reportError(error, { operation: "pro.restore" });
      Alert.alert("Could not restore", "Please try again in a moment.");
    } finally {
      setIsRestoring(false);
    }
  };

  return { restorePurchases, isRestoring };
}
