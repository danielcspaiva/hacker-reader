import { router } from "expo-router";

import { usePro } from "@/contexts/pro-context";
import { useAnalytics } from "@/hooks/use-analytics";
import { useProGate } from "@/hooks/use-pro-gate";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import type { SummarySource } from "@/lib/analytics/tracking";
import type { StoryWithComments } from "@/lib/hn";

/**
 * Entry point for "Summarize": `summarize(source)` goes through the Pro gate
 * and opens the summary sheet. `summarize` is undefined when Pro is not
 * available in this build, so the menu item and the pill are simply hidden.
 */
export function useSummarizeStory(story: StoryWithComments) {
  const { isAvailable } = usePro();
  const { requirePro } = useProGate();
  const analytics = useAnalytics();

  if (!isAvailable) return undefined;

  return (source: SummarySource) => {
    if (!requirePro("ai_summaries")) return;
    analytics.track(AnalyticsEvent.SUMMARY_REQUESTED, {
      [AnalyticsProperty.STORY_ID]: story.id,
      [AnalyticsProperty.COMMENT_COUNT]: story.descendants ?? 0,
      [AnalyticsProperty.SUMMARY_SOURCE]: source,
    });
    router.push({
      pathname: "/story/[id]/summary",
      params: { id: String(story.id) },
    });
  };
}
