import { StoryCard } from '@/components/story-card';
import { ThemedText } from '@/components/themed-text';
import { useBookmarks } from '@/hooks/use-bookmarks';
import { useThemeColor } from '@/hooks/use-theme-color';
import { HNItem } from '@/lib/hn-api';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <ThemedText style={styles.emptyText}>No bookmarks yet</ThemedText>
      <ThemedText style={styles.emptySubtext}>
        Long press on any story to bookmark it
      </ThemedText>
    </View>
  );
}

export default function BookmarksScreen() {
  const { data: stories = [], isLoading, refetch, isRefetching } = useBookmarks();
  const textColor = useThemeColor({}, 'text');
  const { bottom } = useSafeAreaInsets();
  const listRef = useRef<FlashListRef<HNItem>>(null);
  const previousCountRef = useRef(stories.length);

  // Scroll to top when new bookmarks are added
  useEffect(() => {
    if (stories.length > previousCountRef.current && stories.length > 0) {
      // New bookmark was added, scroll to top
      listRef.current?.scrollToTop({ animated: true });
    }
    previousCountRef.current = stories.length;
  }, [stories.length]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={textColor} />
      </View>
    );
  }

  if (stories.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState />
      </View>
    );
  }

  return (
    <FlashList<HNItem>
      ref={listRef}
      data={stories}
      renderItem={({ item, index }) => <StoryCard story={item} index={index + 1} />}
      keyExtractor={(item) => item.id.toString()}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingBottom: Platform.select({
          android: 100 + bottom,
          default: 0,
        }),
      }}
      onRefresh={() => {
        // Only trigger refetch if not already loading or refetching
        if (!isLoading && !isRefetching) {
          refetch();
        }
      }}
      refreshing={isRefetching}
    />
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.7,
  },
  emptySubtext: {
    fontSize: 15,
    opacity: 0.5,
    textAlign: 'center',
  },
});
