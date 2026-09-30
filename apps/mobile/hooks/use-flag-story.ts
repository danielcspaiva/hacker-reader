import { useMutation } from "@tanstack/react-query";
import { Alert } from "react-native";

import { useHNAuth } from "@/contexts/hn-auth-context";
import { presentHNWriteError } from "@/hooks/present-hn-write-error";
import { useAnalytics } from "@/hooks/use-analytics";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import { confirmDestructive } from "@/lib/confirm-destructive";
import { hapticNotify, Haptics } from "@/lib/haptics";
import { flag, requireSession } from "@/lib/hn";

export function useFlagStory(storyId: number) {
  const { session, isAuthenticated, logout } = useHNAuth();
  const analytics = useAnalytics();

  const flagMutation = useMutation({
    mutationFn: () => flag(storyId, requireSession(session)),
    onSuccess: () => {
      hapticNotify(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Content Flagged",
        "This content has been reported to Hacker News moderators.",
        [{ text: "OK" }]
      );
      analytics.track(AnalyticsEvent.STORY_FLAGGED, {
        [AnalyticsProperty.STORY_ID]: storyId,
      });
    },
    onError: (error) => {
      hapticNotify(Haptics.NotificationFeedbackType.Error);
      presentHNWriteError(error, {
        logout,
        operation: "flag",
        context: { storyId },
        failureMessage: "Failed to flag content. Please try again.",
        karmaMessage: "You need more karma on Hacker News to flag content.",
      });
    },
  });

  return () => {
    if (!isAuthenticated) {
      Alert.alert(
        "Sign In Required",
        "Sign in from the Profile tab to flag content.",
        [{ text: "OK" }]
      );
      return;
    }

    confirmDestructive({
      title: "Flag Content",
      message: "Report this story as inappropriate?",
      confirmLabel: "Flag",
      onConfirm: () => {
        if (!flagMutation.isPending) flagMutation.mutate();
      },
    });
  };
}
