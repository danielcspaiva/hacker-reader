import { CategoryFilter, type Category } from "@/components/category-filter";
import { StoryCardSkeleton } from "@/components/story-card-skeleton";
import { ThemedText } from "@/components/themed-text";
import { usePrefetchCategories, useStories } from "@/hooks/use-stories";
import { useThemeColor } from "@/hooks/use-theme-color";
import { HNItem } from "@/lib/hn-api";
import { FlashList } from "@shopify/flash-list";
import { Stack } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StoryCard } from "@/components/story-card";

export default function FeedScreen() {
  const [category, setCategory] = useState<Category>("top");

  const {
    data,
    isPending,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useStories(category);

  const stories = data?.pages.flatMap((page) => page) ?? [];

  // Intelligently prefetch other categories in the background
  usePrefetchCategories(category, isPending, stories.length > 0);

  const { bottom } = useSafeAreaInsets();
  const textColor = useThemeColor({}, "text");

  return (
    <>
      <Stack.Screen
        options={{
          title: "Stories",
          headerShown: true,
          headerLargeTitle: true,
        }}
      />
      <FlashList<HNItem | null>
        data={isPending ? Array(10).fill(null) : stories}
        renderItem={({ item, index }) =>
          item ? (
            <StoryCard story={item} index={index + 1} />
          ) : (
            <StoryCardSkeleton />
          )
        }
        keyExtractor={(item, index) =>
          item ? item.id.toString() : `skeleton-${index}`
        }
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={
          <CategoryFilter
            category={category}
            onSelectCategory={setCategory}
          />
        }
        contentContainerStyle={{
          paddingBottom: Platform.select({
            android: 100 + bottom,
            default: 0,
          }),
        }}
        onRefresh={() => {
          // Only trigger refetch if not already loading or refetching
          if (!isPending && !isRefetching) {
            refetch();
          }
        }}
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
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    paddingVertical: 20,
    alignItems: "center",
  },
});
