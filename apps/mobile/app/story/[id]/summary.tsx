import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";

import { SummaryBody, SummarySkeleton } from "@/components/story/story-summary";
import { Button, EmptyState, ScrollScreen } from "@/components/ui";
import { useAnalytics } from "@/hooks/use-analytics";
import { useStorySummary } from "@/hooks/use-story-summary";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import { reportError } from "@/lib/observability/report-error";
import { proApi, ProApiError } from "@/lib/pro/api";
import { describeSummaryFailure } from "@/lib/pro/summary";

/**
 * AI summary of a story (Pro), presented as a sheet over the story. Opened
 * through `useSummarizeStory`, which has already passed the Pro gate.
 */
export default function StorySummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const storyId = Number(id);
  const analytics = useAnalytics();
  const { data: summary, error, isPending, refetch } = useStorySummary(storyId);
  const viewed = useRef(false);
  // Captured once so "Generated N min ago" does not tick on re-renders.
  const [openedAt] = useState(Date.now);

  useEffect(() => {
    if (!summary || viewed.current) return;
    viewed.current = true;
    analytics.track(AnalyticsEvent.SUMMARY_VIEWED, {
      [AnalyticsProperty.STORY_ID]: storyId,
      [AnalyticsProperty.COMMENT_COUNT]: summary.commentCountAtGeneration,
    });
  }, [summary, storyId, analytics]);

  useEffect(() => {
    // Expected failures (limits, not enough comments) are not bugs.
    if (error && !(error instanceof ProApiError && error.status < 500)) {
      reportError(error, { operation: "storySummary", storyId });
    }
  }, [error, storyId]);

  const openComment = (commentId: number) => {
    analytics.track(AnalyticsEvent.SUMMARY_COMMENT_LINK_TAPPED, {
      [AnalyticsProperty.STORY_ID]: storyId,
      [AnalyticsProperty.COMMENT_ID]: commentId,
    });
    // Closes the sheet and hands the story screen its `commentId` param,
    // which scrolls to the comment and highlights it.
    router.dismissTo({
      pathname: "/story/[id]",
      params: { id: String(storyId), commentId: String(commentId) },
    });
  };

  if (!proApi.isConfigured) {
    return (
      <ScrollScreen>
        <EmptyState
          fill={false}
          icon="offline"
          title="Summaries aren't available"
          message="This build is not connected to the Hacker Reader server."
        />
      </ScrollScreen>
    );
  }

  if (error) {
    const failure = describeSummaryFailure(
      error instanceof ProApiError ? error.status : undefined,
      error instanceof ProApiError ? error.code : undefined
    );
    return (
      <ScrollScreen>
        <EmptyState
          fill={false}
          icon="error"
          title={failure.title}
          message={failure.message}
          action={
            failure.needsPro ? (
              <Button
                label="See Pro"
                variant="secondary"
                onPress={() =>
                  router.replace({
                    pathname: "/pro",
                    params: { feature: "ai_summaries" },
                  })
                }
              />
            ) : failure.retryable ? (
              <Button
                label="Try Again"
                variant="secondary"
                onPress={() => void refetch()}
              />
            ) : undefined
          }
        />
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen>
      {isPending || !summary ? (
        <SummarySkeleton />
      ) : (
        <SummaryBody
          summary={summary}
          now={openedAt}
          onOpenComment={openComment}
        />
      )}
    </ScrollScreen>
  );
}
