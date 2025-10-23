import { CategoryFilter, type Category } from "@/components/category-filter";
import { StoryCard } from "@/components/story-card";
import { ThemedText } from "@/components/themed-text";
import {
  useAskStories,
  useJobStories,
  useNewStories,
  useShowStories,
  useTopStories,
} from "@/hooks/use-stories";
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

export default function FeedScreen() {
  const [category, setCategory] = useState<Category>("top");

  // Call all hooks unconditionally at the top level
  const topStories = useTopStories();
  const newStories = useNewStories();
  const askStories = useAskStories();
  const showStories = useShowStories();
  const jobStories = useJobStories();

  // Select the appropriate query result based on category
  const queryResult = {
    top: topStories,
    new: newStories,
    ask: askStories,
    show: showStories,
    jobs: jobStories,
  }[category];

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = queryResult;

  const stories = data?.pages.flatMap((page) => page) ?? [];

  const { bottom } = useSafeAreaInsets();
  const textColor = useThemeColor({}, "text");

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Stories",
            headerShown: true,
            headerLargeTitle: true,
          }}
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={textColor} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Stories",
          headerShown: true,
          headerLargeTitle: true,
        }}
      />
      <FlashList<HNItem>
        data={stories}
        renderItem={({ item, index }) => (
          <StoryCard story={item} index={index + 1} />
        )}
        keyExtractor={(item) => item.id.toString()}
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
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    paddingVertical: 20,
    alignItems: "center",
  },
});
