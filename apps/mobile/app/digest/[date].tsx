import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";

import { ErrorState } from "@/components/error-state";
import { StoryCard } from "@/components/story-card";
import { StoryCardSkeleton } from "@/components/story-card-skeleton";
import { Button, EmptyState, ScrollScreen, Text } from "@/components/ui";
import { useAnalytics } from "@/hooks/use-analytics";
import { useDigest, useDigestStories } from "@/hooks/use-digest";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import type { DigestSource } from "@/lib/analytics/tracking";
import { isValidDay } from "@/lib/format/day";
import { reportError } from "@/lib/observability/report-error";
import { proApi, ProApiError } from "@/lib/pro/api";
import { describeDigestFailure, formatDigestDate } from "@/lib/pro/digest";

const param = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/**
 * The daily digest of a UTC day (Pro): the stories as cards, each with its AI
 * "why it matters" line. Opened by the morning push or `hnclient://digest/<date>`.
 */
export default function DigestScreen() {
  const params = useLocalSearchParams<{ date?: string; source?: string }>();
  const date = param(params.date) ?? "";
  const source: DigestSource =
    param(params.source) === "notification" ? "notification" : "link";
  const valid = isValidDay(date);
  const analytics = useAnalytics();
  const viewed = useRef(false);

  const digest = useDigest(valid ? date : "");
  const stories = useDigestStories(digest.data);

  useEffect(() => {
    if (!digest.data || viewed.current) return;
    viewed.current = true;
    analytics.track(AnalyticsEvent.DIGEST_VIEWED, {
      [AnalyticsProperty.DIGEST_DATE]: digest.data.date,
      [AnalyticsProperty.DIGEST_SOURCE]: source,
    });
  }, [digest.data, source, analytics]);

  useEffect(() => {
    // Expected failures (not Pro, expired digest) are not bugs.
    const error = digest.error;
    if (error && !(error instanceof ProApiError && error.status < 500)) {
      reportError(error, { operation: "digest", date });
    }
  }, [digest.error, date]);

  const title = valid ? formatDigestDate(date) : "Daily Digest";

  if (!valid) {
    return (
      <>
        <Stack.Screen options={{ title: "Daily Digest" }} />
        <ScrollScreen>
          <EmptyState
            fill={false}
            icon="error"
            title="Not a digest link"
            message="That date isn't valid."
          />
        </ScrollScreen>
      </>
    );
  }

  if (!proApi.isConfigured) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <ScrollScreen>
          <EmptyState
            fill={false}
            icon="offline"
            title="The digest isn't available"
            message="This build is not connected to the Hacker Reader server."
          />
        </ScrollScreen>
      </>
    );
  }

  if (digest.error) {
    const failure = describeDigestFailure(
      digest.error instanceof ProApiError ? digest.error.status : undefined
    );
    return (
      <>
        <Stack.Screen options={{ title }} />
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
                    router.push({
                      pathname: "/pro",
                      params: { feature: "daily_digest" },
                    })
                  }
                />
              ) : failure.retryable ? (
                <Button
                  label="Try Again"
                  variant="secondary"
                  onPress={() => void digest.refetch()}
                />
              ) : undefined
            }
          />
        </ScrollScreen>
      </>
    );
  }

  const blurbs = new Map(
    (digest.data?.stories ?? []).map((story) => [story.id, story.blurb])
  );
  const isLoading = digest.isPending || (!!digest.data && stories.isPending);

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ScrollScreen
        gap={12}
        onRefresh={() => {
          void digest.refetch();
          void stories.refetch();
        }}
        refreshing={digest.isRefetching || stories.isRefetching}
      >
        {isLoading ? (
          Array.from({ length: 5 }, (_, index) => (
            <StoryCardSkeleton key={index} />
          ))
        ) : stories.isError || !stories.data?.length ? (
          <ErrorState
            title="Couldn't load the stories"
            onRetry={() => void stories.refetch()}
          />
        ) : (
          <>
            {stories.data.map((story, index) => {
              const blurb = blurbs.get(story.id);
              return (
                <View key={story.id} style={styles.entry}>
                  <StoryCard story={story} rank={index + 1} />
                  {blurb ? (
                    <Text variant="callout" tone="muted" style={styles.blurb}>
                      {blurb}
                    </Text>
                  ) : null}
                </View>
              );
            })}
            <Text variant="caption" tone="tertiary" style={styles.footer}>
              Summaries by AI · can be wrong
            </Text>
          </>
        )}
      </ScrollScreen>
    </>
  );
}

const styles = StyleSheet.create({
  entry: { gap: 8 },
  blurb: { paddingHorizontal: 6 },
  footer: { textAlign: "center", paddingVertical: 8 },
});
