import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StoryCard } from '@/components/story-card';
import { ThemedText } from '@/components/themed-text';
import { useSearchStories } from '@/hooks/use-search-stories';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { HNItem } from '@hn/shared';

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const { bottom } = useSafeAreaInsets();
  const textColor = useThemeColor({}, 'text');

  const queryParam = params?.q;
  const rawQuery = Array.isArray(queryParam) ? queryParam[0] : queryParam ?? '';
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

  if (isQueryEmpty) {
    return (
      <View style={[styles.centered, styles.placeholder]}>
        <ThemedText type="title">Search Hacker News</ThemedText>
        <ThemedText style={styles.placeholderText}>
          Use the search bar above to find stories.
        </ThemedText>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={textColor} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <ThemedText>Something went wrong while searching.</ThemedText>
        <ThemedText style={styles.helperText}>{error?.message}</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList<HNItem>
        data={stories}
        renderItem={({ item, index }) => <StoryCard story={item} index={index + 1} />}
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
              Showing results for{' '}
              <ThemedText style={styles.helperHighlight}>{trimmedQuery}</ThemedText>
            </ThemedText>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <ThemedText>
              No stories match &quot;<ThemedText style={styles.helperHighlight}>{trimmedQuery}</ThemedText>&quot;.
            </ThemedText>
          </View>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={textColor} />
            </View>
          ) : null
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        onRefresh={() => {
          // Only trigger refetch if not already loading or refetching
          if (!isLoading && !isRefetching) {
            refetch();
          }
        }}
        refreshing={isRefetching}
        // onScrollBeginDrag={() => Keyboard.dismiss()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: '600',
  },
  emptyState: {
    paddingHorizontal: 16,
    paddingVertical: 40,
    alignItems: 'center',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  placeholder: {
    paddingHorizontal: 24,
    gap: 12,
  },
  placeholderText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
});
