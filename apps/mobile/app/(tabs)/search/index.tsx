import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import type { SearchBarCommands } from "react-native-screens";

import { ErrorState } from "@/components/error-state";
import { toolbarIcon } from "@/components/navigation/toolbar-icon";
import { StoryCard } from "@/components/story-card";
import { StoryCardSkeleton } from "@/components/story-card-skeleton";
import { SubmissionCommentCard } from "@/components/submission-comment-card";
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
import { useSearchOptions } from "@/hooks/use-search-options";
import { useSearchStories } from "@/hooks/use-search-stories";
import { useTheme } from "@/hooks/use-theme";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import {
  hasActiveFilters,
  hasNonDefaultOptions,
  parseSearchQuery,
  SEARCH_DATE_RANGES,
  SEARCH_SCOPES,
  SEARCH_SORTS,
  SEARCH_MIN_POINTS,
  type HNItem,
  type SearchCommentHit,
  type SearchDateRange,
  type SearchMinPoints,
  type SearchScope,
  type SearchSort,
} from "@/lib/hn";

const SEARCH_DEBOUNCE_MS = 300;
const SUGGESTIONS = ["Show HN", "Rust", "SQLite", "AI"];

const SORT_LABELS: Record<SearchSort, string> = {
  relevance: "Relevance",
  date: "Newest",
};
const SCOPE_LABELS: Record<SearchScope, string> = {
  story: "Stories",
  comment: "Comments",
};
const DATE_RANGE_LABELS: Record<SearchDateRange, string> = {
  any: "Any time",
  day: "Past 24 hours",
  week: "Past week",
  month: "Past month",
  year: "Past year",
};
const minPointsLabel = (points: SearchMinPoints) =>
  points === 0 ? "Any points" : `${points}+ points`;

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const analytics = useAnalytics();
  const searchBarRef = useRef<SearchBarCommands>(null);
  const { recentSearches, addSearch, clearSearches } = useRecentSearches();
  // What the search bar holds right now; the `q` param follows it after a pause.
  const [draft, setDraft] = useState<string | null>(null);
  const { options, isLoaded, setOptions } = useSearchOptions();
  const isComments = options.scope === "comment";

  const queryParam = params?.q;
  const rawQuery = Array.isArray(queryParam)
    ? queryParam[0]
    : (queryParam ?? "");
  const trimmedQuery = rawQuery.trim();
  const parsedQuery = parseSearchQuery(trimmedQuery);
  // `author:pg` alone is a valid search (that user's stories or comments).
  const isQueryEmpty =
    parsedQuery.text.length === 0 && parsedQuery.author === null;

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    isRefetching,
    refetch,
    isError,
  } = useSearchStories(trimmedQuery, options, isLoaded);

  const stories = data?.pages.flatMap((page) => page.hits) ?? [];

  const commentHits = data?.pages.flatMap((page) => page.commentHits) ?? [];

  const firstPage = data?.pages[0];
  const firstPageCount = firstPage
    ? firstPage.hits.length + firstPage.commentHits.length
    : undefined;
  const hasResults =
    !isQueryEmpty && !isLoading && firstPageCount !== undefined;

  useEffect(() => {
    if (hasResults) {
      analytics.track(AnalyticsEvent.SEARCH_PERFORMED, {
        [AnalyticsProperty.QUERY]: trimmedQuery,
        [AnalyticsProperty.RESULTS_COUNT]: firstPageCount,
        [AnalyticsProperty.SEARCH_SORT]: options.sort,
        [AnalyticsProperty.SEARCH_SCOPE]: options.scope,
        [AnalyticsProperty.SEARCH_DATE_RANGE]: options.dateRange,
        [AnalyticsProperty.SEARCH_MIN_POINTS]:
          options.scope === "story" ? options.minPoints : 0,
        [AnalyticsProperty.SEARCH_HAS_AUTHOR]: parsedQuery.author !== null,
      });
    }
    // Fires once per completed search: a changed option is a new search.
  }, [
    trimmedQuery,
    hasResults,
    firstPageCount,
    options,
    parsedQuery.author,
    analytics,
  ]);

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

  const isFiltered = hasNonDefaultOptions(options);
  const filterSummary = [
    options.sort === "date" ? SORT_LABELS.date : null,
    options.dateRange !== "any" ? DATE_RANGE_LABELS[options.dateRange] : null,
    !isComments && options.minPoints > 0
      ? minPointsLabel(options.minPoints)
      : null,
  ].filter(Boolean);

  const optionsMenu = (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Menu
        icon={toolbarIcon(isFiltered ? "filterFilled" : "filter")}
        iconRenderingMode="template"
        title="Search Options"
        tintColor={isFiltered ? colors.primary : undefined}
        accessibilityLabel={
          isFiltered ? "Search options, filters active" : "Search options"
        }
      >
        <Stack.Toolbar.Menu inline title="Sort by">
          {SEARCH_SORTS.map((sort) => (
            <Stack.Toolbar.MenuAction
              key={sort}
              isOn={options.sort === sort}
              onPress={() => setOptions({ sort })}
            >
              {SORT_LABELS[sort]}
            </Stack.Toolbar.MenuAction>
          ))}
        </Stack.Toolbar.Menu>
        <Stack.Toolbar.Menu inline title="Search in">
          {SEARCH_SCOPES.map((scope) => (
            <Stack.Toolbar.MenuAction
              key={scope}
              isOn={options.scope === scope}
              onPress={() => setOptions({ scope })}
            >
              {SCOPE_LABELS[scope]}
            </Stack.Toolbar.MenuAction>
          ))}
        </Stack.Toolbar.Menu>
        <Stack.Toolbar.Menu inline title="Date">
          {SEARCH_DATE_RANGES.map((dateRange) => (
            <Stack.Toolbar.MenuAction
              key={dateRange}
              isOn={options.dateRange === dateRange}
              onPress={() => setOptions({ dateRange })}
            >
              {DATE_RANGE_LABELS[dateRange]}
            </Stack.Toolbar.MenuAction>
          ))}
        </Stack.Toolbar.Menu>
        {isComments ? null : (
          <Stack.Toolbar.Menu inline title="Points">
            {SEARCH_MIN_POINTS.map((minPoints) => (
              <Stack.Toolbar.MenuAction
                key={minPoints}
                isOn={options.minPoints === minPoints}
                onPress={() => setOptions({ minPoints })}
              >
                {minPointsLabel(minPoints)}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
        )}
      </Stack.Toolbar.Menu>
    </Stack.Toolbar>
  );

  const resultsHeader =
    !isLoading && (isComments ? commentHits.length : stories.length) > 0 ? (
      <View style={styles.helper}>
        <Text variant="caption" tone="muted">
          Results for{" "}
          <Text variant="caption" weight="semibold">
            {trimmedQuery}
          </Text>
          {filterSummary.length > 0 ? ` · ${filterSummary.join(" · ")}` : ""}
        </Text>
      </View>
    ) : undefined;

  const emptyState = isError ? (
    <ErrorState
      title="Search failed"
      message="Something went wrong while searching. Try again."
      onRetry={() => void refetch()}
    />
  ) : (
    <EmptyState
      icon="searchEmpty"
      title={isComments ? "No comments" : "No stories"}
      message={`No ${isComments ? "comments" : "stories"} match “${trimmedQuery}”${
        hasActiveFilters(options) ? " with these filters" : ""
      }.`}
    />
  );

  const searchBar = (
    <Stack.SearchBar
      ref={searchBarRef}
      placeholder="Search Hacker News"
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
  } else if (isComments) {
    content = (
      <ListScreen<SearchCommentHit>
        data={commentHits}
        isLoading={isLoading}
        skeleton={<StoryCardSkeleton />}
        skeletonCount={5}
        renderItem={({ item }) => (
          <SubmissionCommentCard
            comment={item.comment}
            known={{ storyId: item.storyId, storyTitle: item.storyTitle }}
            showAuthor
          />
        )}
        keyExtractor={(item) => item.comment.id.toString()}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={resultsHeader}
        empty={emptyState}
        onLoadMore={hasNextPage ? () => void fetchNextPage() : undefined}
        isLoadingMore={isFetchingNextPage}
        onEndReachedThreshold={0.5}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
      />
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
        ListHeaderComponent={resultsHeader}
        empty={emptyState}
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
      {optionsMenu}
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
