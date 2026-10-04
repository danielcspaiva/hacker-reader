import type { FlashListRef } from "@shopify/flash-list";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import type { HeaderBarButtonItem } from "react-native-screens";

import { ErrorState } from "@/components/error-state";
import { useSplitHeaderOptions } from "@/components/navigation/header-options";
import { toolbarIcon } from "@/components/navigation/toolbar-icon";
import { StoryCard } from "@/components/story-card";
import { StoryCardSkeleton } from "@/components/story-card-skeleton";
import { StorySplitView } from "@/components/story/story-split-view";
import { EmptyState, ICON_GLYPHS, ListScreen } from "@/components/ui";
import { CATEGORY_LABELS, CATEGORY_TITLES } from "@/constants/categories";
import { useFeedCategory } from "@/contexts/feed-category-context";
import { useAnalytics } from "@/hooks/use-analytics";
import { useBlockedUsers } from "@/hooks/use-blocked-users";
import { useHiddenStories } from "@/hooks/use-hidden-items";
import { useMutes } from "@/hooks/use-mutes";
import {
  usePrefetchVisibleStories,
  visibleStoryId,
} from "@/hooks/use-prefetch-visible-stories";
import { useStories } from "@/hooks/use-stories";
import { useWideLayout } from "@/hooks/use-wide-layout";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import { yesterdayDay } from "@/lib/format/day";
import { hapticSelection } from "@/lib/haptics";
import { STORY_CATEGORIES, type HNItem, type StoryCategory } from "@/lib/hn";
import { syncTopStoriesWidget } from "@/lib/widgets/sync";

export default function FeedScreen() {
  const { category, setCategory } = useFeedCategory();
  const router = useRouter();
  const analytics = useAnalytics();
  const { isHidden } = useHiddenStories();
  const { isBlocked } = useBlockedUsers();
  const { isMuted } = useMutes();

  const {
    data,
    isPending,
    isError,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useStories(category);

  const allStories = data?.pages.flatMap((page) => page) ?? [];
  const stories = allStories.filter(
    (story) =>
      !isHidden(story.id) &&
      (!story.by || !isBlocked(story.by)) &&
      !isMuted(story)
  );

  const listRef = useRef<FlashListRef<HNItem>>(null);
  const prefetchVisibleStories = usePrefetchVisibleStories(visibleStoryId);

  // With automatic content insets the resting top is a negative offset.
  const restingTop = useRef(0);

  const currentPage = useRef(0);
  useEffect(() => {
    const newPageCount = data?.pages.length ?? 0;
    if (newPageCount > currentPage.current && currentPage.current > 0) {
      analytics.track(AnalyticsEvent.INFINITE_SCROLL_TRIGGERED, {
        [AnalyticsProperty.CATEGORY]: category,
        [AnalyticsProperty.PAGE_NUMBER]: newPageCount,
      });
    }
    currentPage.current = newPageCount;
  }, [data?.pages.length, category, analytics]);

  const handleSelectCategory = (newCategory: StoryCategory) => {
    if (newCategory === category) return;
    hapticSelection();
    analytics.track(AnalyticsEvent.CATEGORY_CHANGED, {
      [AnalyticsProperty.FROM_CATEGORY]: category,
      [AnalyticsProperty.TO_CATEGORY]: newCategory,
    });
    setCategory(newCategory);
    listRef.current?.scrollToOffset({
      offset: restingTop.current,
      animated: true,
    });
  };

  const wide = useWideLayout();
  // On iPad the window toolbar's trailing item sits at the far edge of the
  // bar, past the detail pane. The wide list column has its own bar.
  const columnChrome = wide && Platform.OS === "ios";
  const splitHeader = useSplitHeaderOptions(CATEGORY_TITLES[category]);
  const categoryMenu: HeaderBarButtonItem = {
    type: "menu",
    icon: { type: "sfSymbol", name: ICON_GLYPHS[category].ios },
    accessibilityLabel: `Category: ${CATEGORY_LABELS[category]}`,
    menu: {
      items: [
        ...STORY_CATEGORIES.map((cat) => ({
          type: "action" as const,
          title: CATEGORY_LABELS[cat],
          icon: { type: "sfSymbol" as const, name: ICON_GLYPHS[cat].ios },
          state: cat === category ? ("on" as const) : ("off" as const),
          onPress: () => handleSelectCategory(cat),
        })),
        {
          type: "submenu",
          displayInline: true,
          items: [
            {
              type: "action",
              title: "Past Front Pages…",
              icon: {
                type: "sfSymbol",
                name: ICON_GLYPHS.pastFrontPages.ios,
              },
              onPress: () =>
                router.push({
                  pathname: "/front/[day]",
                  params: { day: yesterdayDay() },
                }),
            },
            {
              type: "action",
              title: "Submit a Story…",
              icon: { type: "sfSymbol", name: ICON_GLYPHS.compose.ios },
              onPress: () =>
                router.push({
                  pathname: "/submit",
                  params: { source: "feed_menu" },
                }),
            },
          ],
        },
      ],
    },
  };

  return (
    <>
      <Stack.Screen
        options={{
          // The category name is the large title on a phone and the list-column
          // title on iPad. The header menu switches it.
          ...splitHeader,
        }}
      />
      {columnChrome ? null : (
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.View hidesSharedBackground>
            <Image
              source={require("@/assets/images/widget-logo.png")}
              style={{ width: 28, height: 28 }}
              accessible
              accessibilityLabel="Hacker Reader"
            />
          </Stack.Toolbar.View>
        </Stack.Toolbar>
      )}
      {columnChrome ? null : (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Menu
            icon={toolbarIcon(category)}
            iconRenderingMode="template"
            title="Stories"
            accessibilityLabel={`Category: ${CATEGORY_LABELS[category]}`}
          >
            {STORY_CATEGORIES.map((cat) => (
              <Stack.Toolbar.MenuAction
                key={cat}
                icon={toolbarIcon(cat)}
                isOn={cat === category}
                onPress={() => handleSelectCategory(cat)}
              >
                {CATEGORY_LABELS[cat]}
              </Stack.Toolbar.MenuAction>
            ))}
            <Stack.Toolbar.Menu inline title="">
              <Stack.Toolbar.MenuAction
                icon={toolbarIcon("pastFrontPages")}
                onPress={() =>
                  router.push({
                    pathname: "/front/[day]",
                    params: { day: yesterdayDay() },
                  })
                }
              >
                Past Front Pages…
              </Stack.Toolbar.MenuAction>
              <Stack.Toolbar.MenuAction
                icon={toolbarIcon("compose")}
                onPress={() =>
                  router.push({
                    pathname: "/submit",
                    params: { source: "feed_menu" },
                  })
                }
              >
                Submit a Story…
              </Stack.Toolbar.MenuAction>
            </Stack.Toolbar.Menu>
          </Stack.Toolbar.Menu>
        </Stack.Toolbar>
      )}
      <StorySplitView
        title={CATEGORY_TITLES[category]}
        headerLeft={
          columnChrome ? (
            <Image
              source={require("@/assets/images/widget-logo.png")}
              style={{ width: 28, height: 28 }}
              accessible
              accessibilityLabel="Hacker Reader"
            />
          ) : undefined
        }
        headerRightItems={columnChrome ? [categoryMenu] : undefined}
      >
        <ListScreen<HNItem>
          listRef={listRef}
          {...prefetchVisibleStories}
          data={stories}
          isLoading={isPending}
          skeleton={<StoryCardSkeleton />}
          skeletonCount={8}
          renderItem={({ item, index }) => (
            <StoryCard story={item} rank={index + 1} />
          )}
          keyExtractor={(item) => item.id.toString()}
          scrollToOverflowEnabled
          onScroll={(event) => {
            restingTop.current = Math.min(
              restingTop.current,
              event.nativeEvent.contentOffset.y
            );
          }}
          refreshing={isRefetching}
          onRefresh={() => {
            void refetch().then(() => {
              if (category === "top") {
                syncTopStoriesWidget({ force: true });
              }
            });
          }}
          onLoadMore={hasNextPage ? () => void fetchNextPage() : undefined}
          isLoadingMore={isFetchingNextPage}
          onEndReachedThreshold={0.3}
          empty={
            isError ? (
              <ErrorState
                title="Couldn't load stories"
                onRetry={() => void refetch()}
              />
            ) : (
              <EmptyState
                icon="stories"
                title="No stories found"
                message="Pull down to refresh."
              />
            )
          }
        />
      </StorySplitView>
    </>
  );
}
