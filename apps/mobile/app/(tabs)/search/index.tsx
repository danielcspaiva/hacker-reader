import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import type { SearchBarCommands } from "react-native-screens";

import { ErrorState } from "@/components/error-state";
import { StoryCard } from "@/components/story-card";
import { StoryCardSkeleton } from "@/components/story-card-skeleton";
import {
  Button,
  EmptyState,
  IconTile,
  ListRow,
  ListScreen,
  ListSection,
  ScrollScreen,
  Text,
} from "@/components/ui";
import { useAnalytics } from "@/hooks/use-analytics";
import { useRecentSearches } from "@/hooks/use-recent-searches";
import { useSearchStories } from "@/hooks/use-search-stories";
import { useTheme } from "@/hooks/use-theme";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import type { HNItem } from "@/lib/hn";

const SEARCH_DEBOUNCE_MS = 300;
const SUGGESTIONS = ["Show HN", "Rust", "SQLite", "AI"];

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const analytics = useAnalytics();
  const searchBarRef = useRef<SearchBarCommands>(null);
  const { recentSearches, addSearch, clearSearches } = useRecentSearches();
  // What the search bar holds right now; the `q` param follows it after a pause.
  const [draft, setDraft] = useState<string | null>(null);

  const queryParam = params?.q;
  const rawQuery = Array.isArray(queryParam)
    ? queryParam[0]
    : (queryParam ?? "");
  const trimmedQuery = rawQuery.trim();
  const isQueryEmpty = trimmedQuery.length === 0;

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    isRefetching,
    refetch,
    isError,
  } = useSearchStories(trimmedQuery);

  const stories = data?.pages.flatMap((page) => page.hits) ?? [];

  const firstPageCount = data?.pages[0]?.hits.length;
  const hasResults =
    !isQueryEmpty && !isLoading && firstPageCount !== undefined;

  useEffect(() => {
    if (hasResults) {
      analytics.track(AnalyticsEvent.SEARCH_PERFORMED, {
        [AnalyticsProperty.QUERY]: trimmedQuery,
        [AnalyticsProperty.RESULTS_COUNT]: firstPageCount,
      });
    }
  }, [trimmedQuery, hasResults, firstPageCount, analytics]);

  useEffect(() => {
    if (hasResults) addSearch(trimmedQuery);
  }, [trimmedQuery, hasResults, addSearch]);

  useEffect(() => {
    if (draft === null) return;
    const timer = setTimeout(() => {
      router.setParams({ q: draft.trim().length > 0 ? draft : undefined });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, router]);

  const runSearch = (term: string) => {
    setDraft(null);
    searchBarRef.current?.setText(term);
    router.setParams({ q: term });
  };

  const searchBar = (
    <Stack.SearchBar
      ref={searchBarRef}
      placeholder="Search stories"
      hideWhenScrolling={false}
      onChangeText={(event) => setDraft(event.nativeEvent.text ?? "")}
      tintColor={colors.primary}
      textColor={colors.foreground}
      hintTextColor={colors.mutedForeground}
      headerIconColor={colors.mutedForeground}
    />
  );

  let content: ReactNode;

  if (isQueryEmpty) {
    const hasRecents = recentSearches.length > 0;
    content = (
      <ScrollScreen keyboardShouldPersistTaps="handled" gap={24}>
        {hasRecents ? (
          <ListSection
            title="Recent"
            accessory={
              <Button
                label="Clear"
                variant="ghost"
                size="sm"
                accessibilityLabel="Clear recent searches"
                onPress={() => clearSearches()}
              />
            }
          >
            {recentSearches.map((term) => (
              <ListRow
                key={term}
                title={term}
                leading={<IconTile name="time" hue="gray" />}
                chevron
                onPress={() => runSearch(term)}
              />
            ))}
          </ListSection>
        ) : (
          <EmptyState
            fill={false}
            icon="searchEmpty"
            title="Search Hacker News"
            message="Find stories, projects and discussions from across the site."
          />
        )}
        <ListSection
          title="Try searching"
          footer="Results come from Algolia's Hacker News index."
        >
          {SUGGESTIONS.map((term) => (
            <ListRow
              key={term}
              title={term}
              leading={<IconTile name="search" hue="orange" />}
              chevron
              onPress={() => runSearch(term)}
            />
          ))}
        </ListSection>
      </ScrollScreen>
    );
  } else {
    content = (
      <ListScreen<HNItem>
        data={stories}
        isLoading={isLoading}
        skeleton={<StoryCardSkeleton />}
        skeletonCount={5}
        renderItem={({ item }) => <StoryCard story={item} />}
        keyExtractor={(item) => item.id.toString()}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          !isLoading && stories.length > 0 ? (
            <View style={styles.helper}>
              <Text variant="caption" tone="muted">
                Results for{" "}
                <Text variant="caption" weight="semibold">
                  {trimmedQuery}
                </Text>
              </Text>
            </View>
          ) : undefined
        }
        empty={
          isError ? (
            <ErrorState
              title="Search failed"
              message="Something went wrong while searching. Try again."
              onRetry={() => void refetch()}
            />
          ) : (
            <EmptyState
              icon="searchEmpty"
              title="No stories"
              message={`No stories match “${trimmedQuery}”.`}
            />
          )
        }
        onLoadMore={hasNextPage ? () => void fetchNextPage() : undefined}
        isLoadingMore={isFetchingNextPage}
        onEndReachedThreshold={0.5}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
      />
    );
  }

  return (
    <>
      {searchBar}
      {content}
    </>
  );
}

const styles = StyleSheet.create({
  helper: {
    paddingHorizontal: 4,
    paddingBottom: 12,
  },
});
