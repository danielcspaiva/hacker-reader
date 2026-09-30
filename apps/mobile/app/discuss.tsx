import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import { View } from "react-native";

import { ErrorState } from "@/components/error-state";
import { StoryCard } from "@/components/story-card";
import { StoryCardSkeleton } from "@/components/story-card-skeleton";
import {
  Button,
  EmptyState,
  Screen,
  ScrollScreen,
  Text,
} from "@/components/ui";
import { useAnalytics } from "@/hooks/use-analytics";
import { useDiscussions } from "@/hooks/use-discussions";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import { normalizeUrl } from "@/lib/format/url";

/**
 * "Discussions on HN" for a link (`?url=`, from the share extension or the
 * `hnclient://discuss` deep link). With none, hands over to the submit sheet
 * prefilled with the link and `title`.
 */
export default function DiscussScreen() {
  const { url, title } = useLocalSearchParams<{
    url?: string;
    title?: string;
  }>();
  const analytics = useAnalytics();
  const valid = !!url && normalizeUrl(url) !== null;
  const { data, isPending, isError, refetch } = useDiscussions(
    valid ? url : undefined
  );
  const handled = useRef(false);

  const submitParams = { url, title, source: "share" } as const;

  useEffect(() => {
    if (!data || handled.current) return;
    handled.current = true;
    if (data.length === 0) {
      router.replace({ pathname: "/submit", params: submitParams });
      return;
    }
    analytics.track(AnalyticsEvent.DISCUSSION_FOUND, {
      [AnalyticsProperty.DISCUSSION_COUNT]: data.length,
    });
    // The one-shot guard makes the dependencies irrelevant after the first run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (!valid) {
    return (
      <Screen>
        <EmptyState
          icon="link"
          title="No link to look up"
          message="Share a web link to Hacker Reader to see its discussions."
        />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ErrorState
          title="Couldn't look up discussions"
          onRetry={() => void refetch()}
        />
      </Screen>
    );
  }

  // An empty result is already on its way to the submit sheet.
  if (isPending || !data || data.length === 0) {
    return (
      <ScrollScreen>
        <StoryCardSkeleton />
        <StoryCardSkeleton />
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen>
      <Text variant="callout" tone="muted">
        {data.length === 1
          ? "This link is already on Hacker News."
          : `This link has ${data.length} discussions on Hacker News.`}
      </Text>
      {data.map((story) => (
        <StoryCard key={story.id} story={story} />
      ))}
      <View>
        <Button
          label="Submit it"
          icon="compose"
          variant="secondary"
          size="lg"
          fullWidth
          onPress={() =>
            router.replace({ pathname: "/submit", params: submitParams })
          }
        />
      </View>
    </ScrollScreen>
  );
}
