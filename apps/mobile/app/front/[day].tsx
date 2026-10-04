import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";

import { ErrorState } from "@/components/error-state";
import { DayPicker } from "@/components/front/day-picker";
import { StoryCard } from "@/components/story-card";
import { StoryCardSkeleton } from "@/components/story-card-skeleton";
import {
  EmptyState,
  ICON_GLYPHS,
  ListScreen,
  ListSection,
} from "@/components/ui";
import { useAnalytics } from "@/hooks/use-analytics";
import { useBlockedUsers } from "@/hooks/use-blocked-users";
import { useFrontPage } from "@/hooks/use-front-page";
import { useHiddenStories } from "@/hooks/use-hidden-items";
import {
  usePrefetchVisibleStories,
  visibleStoryId,
} from "@/hooks/use-prefetch-visible-stories";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import {
  addDays,
  formatDayLabel,
  resolveDay,
  todayDay,
} from "@/lib/format/day";
import type { HNItem } from "@/lib/hn";

/** A past day's front page (`hnclient://front/YYYY-MM-DD`), UTC days like HN. */
export default function FrontPageScreen() {
  const params = useLocalSearchParams<{ day?: string }>();
  const router = useRouter();
  const analytics = useAnalytics();
  const { isHidden } = useHiddenStories();
  const { isBlocked } = useBlockedUsers();

  const day = resolveDay(
    Array.isArray(params.day) ? params.day[0] : params.day
  );
  const isToday = day === todayDay();
  const { data, isPending, isError, isRefetching, refetch } = useFrontPage(day);

  useEffect(() => {
    analytics.track(AnalyticsEvent.PAST_FRONT_PAGE_VIEWED, {
      [AnalyticsProperty.DAY]: day,
    });
  }, [day, analytics]);

  const goToDay = (next: string) => router.setParams({ day: next });

  const prefetchVisibleStories = usePrefetchVisibleStories(visibleStoryId);
  const stories = (data ?? []).filter(
    (story) => !isHidden(story.id) && (!story.by || !isBlocked(story.by))
  );

  return (
    <>
      <Stack.Screen options={{ title: formatDayLabel(day) }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={ICON_GLYPHS.chevronLeft.ios}
          accessibilityLabel="Previous day"
          onPress={() => goToDay(addDays(day, -1))}
        />
        <Stack.Toolbar.Button
          icon={ICON_GLYPHS.chevronRight.ios}
          accessibilityLabel="Next day"
          disabled={isToday}
          onPress={() => goToDay(addDays(day, 1))}
        />
      </Stack.Toolbar>
      <ListScreen<HNItem>
        {...prefetchVisibleStories}
        data={stories}
        isLoading={isPending}
        skeleton={<StoryCardSkeleton />}
        skeletonCount={8}
        ListHeaderComponent={
          <ListSection footer="Days are UTC, as on news.ycombinator.com. Ranked by points.">
            <DayPicker day={day} onChange={goToDay} />
          </ListSection>
        }
        renderItem={({ item, index }) => (
          <StoryCard story={item} rank={index + 1} />
        )}
        keyExtractor={(item) => item.id.toString()}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        empty={
          isError ? (
            <ErrorState
              title="Couldn't load this day"
              onRetry={() => void refetch()}
            />
          ) : (
            <EmptyState
              icon="stories"
              title="No front page stories"
              message="Nothing was recorded for this day."
            />
          )
        }
      />
    </>
  );
}
