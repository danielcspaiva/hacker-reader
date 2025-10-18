import { StoryCard } from '@/components/story-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { HNItem } from '@/lib/hn-api';
import { useThemeColor } from '@/hooks/use-theme-color';
import { FlashList } from '@shopify/flash-list';
import { Stack } from 'expo-router';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UseInfiniteQueryResult, InfiniteData } from '@tanstack/react-query';

interface StoryListScreenProps {
  title: string;
  useStoriesHook: () => UseInfiniteQueryResult<InfiniteData<HNItem[], unknown>, Error>;
}

export function StoryListScreen({ title, useStoriesHook }: StoryListScreenProps) {
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useStoriesHook();

  const stories = data?.pages.flatMap((page) => page) ?? [];

  const { bottom } = useSafeAreaInsets();
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title, headerShown: true }} />
        <ThemedView style={styles.centered}>
          <ActivityIndicator size="large" color={textColor} />
        </ThemedView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title, headerShown: true }} />
      <FlashList<HNItem>
        data={stories}
        renderItem={({ item, index }) => (
          <StoryCard story={item} index={index + 1} />
        )}
        keyExtractor={(item) => item.id.toString()}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingBottom: Platform.select({
            android: 100 + bottom,
            default: 0,
          }),
          backgroundColor,
        }}
        onRefresh={() => refetch()}
        refreshing={isRefetching}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.centered}>
            <ThemedText>No stories found</ThemedText>
          </View>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={textColor} />
            </View>
          ) : null
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
