import { FlashList } from "@shopify/flash-list";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useRef } from "react";

import { EmptyState } from "@/components/empty-state";
import { StoryCard } from "@/components/story-card";
import { ThemedText } from "@/components/themed-text";
import { useSearchStories } from "@/hooks/use-search-stories";
import { hapticImpact } from "@/lib/haptics";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useAnalytics } from "@/hooks/use-analytics";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import type { HNItem } from "@/lib/shared";

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const textColor = useThemeColor({}, "text");
  const analytics = useAnalytics();
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    error,
  } = useSearchStories(trimmedQuery);

  const stories = data?.pages.flatMap((page) => page.hits) ?? [];

  useEffect(() => {
    if (!isQueryEmpty && !isLoading && data) {
      analytics.track(AnalyticsEvent.SEARCH_PERFORMED, {
        [AnalyticsProperty.QUERY]: trimmedQuery,
        [AnalyticsProperty.RESULTS_COUNT]: stories.length,
      });
    }
  }, [trimmedQuery, isLoading, data, analytics, stories.length, isQueryEmpty]);

  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  const handleSearchChange = (event: { nativeEvent: { text: string } }) => {
    const value = event.nativeEvent.text ?? "";
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      router.setParams({ q: value.trim().length > 0 ? value : undefined });
    }, 300);
  };

  const searchBar = (
    <Stack.SearchBar
      placeholder="Search stories"
      hideWhenScrolling={false}
      onChangeText={handleSearchChange}
      tintColor={textColor}
    />
  );

  if (isQueryEmpty) {
    return (
      <>
        {searchBar}
        <EmptyState
          title="Search Hacker News"
          description="Use the search bar above to find stories."
          systemImage="magnifyingglass"
        />
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        {searchBar}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={textColor} />
        </View>
      </>
    );
  }

  if (isError) {
    return (
      <>
        {searchBar}
        <EmptyState
          title="Search failed"
          description={error?.message ?? "Something went wrong while searching."}
          systemImage="exclamationmark.triangle"
        />
      </>
    );
  }

  return (
    <>
      {searchBar}
    <FlashList<HNItem>
      data={stories}
      renderItem={({ item, index }) => (
        <StoryCard story={item} index={index + 1} />
      )}
      keyExtractor={(item) => item.id.toString()}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        styles.listContent,
        {
          paddingBottom: Platform.select({
            android: 100 + bottom,
            default: bottom,
          }),
        },
      ]}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={styles.helperContainer}>
          <ThemedText style={styles.helperText}>
            Showing results for{" "}
            <ThemedText style={styles.helperHighlight}>
              {trimmedQuery}
            </ThemedText>
          </ThemedText>
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          title="No stories"
          description={`No stories match “${trimmedQuery}”.`}
          systemImage="doc.text.magnifyingglass"
        />
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.footer}>
            <ActivityIndicator size="small" color={textColor} />
          </View>
        ) : undefined
      }
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      }}
      onEndReachedThreshold={0.5}
      onRefresh={() => {
        if (!isLoading && !isRefetching) {
          hapticImpact();
          refetch();
        }
      }}
      refreshing={isRefetching}
    />
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingTop: 12,
  },
  helperContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  helperText: {
    fontSize: 13,
    opacity: 0.6,
  },
  helperHighlight: {
    fontWeight: "600",
  },
  footer: {
    paddingVertical: 20,
    alignItems: "center",
  },
});
