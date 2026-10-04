import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useHNAuth } from "@/contexts/hn-auth-context";
import { presentHNWriteError } from "@/hooks/present-hn-write-error";
import { useAnalytics } from "@/hooks/use-analytics";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import type { SubmitSource } from "@/lib/analytics/tracking";
import { Haptics, hapticNotify } from "@/lib/haptics";
import {
  hnKeys,
  isAuthError,
  requireSession,
  submit,
  type SubmitStoryInput,
} from "@/lib/hn";

/**
 * Submits a story. Resolves `{ duplicateOf }` (an id when HN already has the
 * link, nothing was posted). A new story refreshes the New feed.
 */
export function useSubmitStory(source: SubmitSource) {
  const { session, logout } = useHNAuth();
  const queryClient = useQueryClient();
  const analytics = useAnalytics();

  return useMutation({
    mutationFn: (input: SubmitStoryInput) =>
      submit(input, requireSession(session)),
    onSuccess: ({ duplicateOf }, input) => {
      if (duplicateOf !== null) {
        hapticNotify(Haptics.NotificationFeedbackType.Warning);
        analytics.track(AnalyticsEvent.SUBMIT_DUPLICATE_FOUND, {
          [AnalyticsProperty.STORY_ID]: duplicateOf,
          [AnalyticsProperty.SUBMIT_SOURCE]: source,
        });
        return;
      }
      hapticNotify(Haptics.NotificationFeedbackType.Success);
      analytics.track(AnalyticsEvent.STORY_SUBMITTED, {
        [AnalyticsProperty.SUBMIT_KIND]: input.url?.trim() ? "link" : "text",
        [AnalyticsProperty.SUBMIT_SOURCE]: source,
      });
      void queryClient.invalidateQueries({ queryKey: hnKeys.stories("new") });
    },
    onError: (error) => {
      // The POST may have landed: refresh New so the story shows if it did.
      if (isAuthError(error) && error.code === "UNCONFIRMED") {
        void queryClient.invalidateQueries({ queryKey: hnKeys.stories("new") });
      }
      presentHNWriteError(error, {
        logout,
        operation: "submitStory",
        failureMessage: "Failed to submit the story. Please try again.",
      });
    },
  });
}
