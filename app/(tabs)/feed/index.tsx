import { CategoryFilter, type Category } from "@/components/category-filter";
import { StoryCardSkeleton } from "@/components/story-card-skeleton";
import { ThemedText } from "@/components/themed-text";
import { usePrefetchCategories, useStories } from "@/hooks/use-stories";
import { useThemeColor } from "@/hooks/use-theme-color";
import { HNItem } from "@/lib/hn-api";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StoryCard } from "@/components/story-card";

const AnimatedFlatList = Animated.FlatList;

const HEADER_SCROLL_OFFSET = isLiquidGlassAvailable() ? 100 : 90;

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

  // Animation setup for sticky header
  const flatListRef = useRef<FlatList>(null);
  const animatedTranslateY = useSharedValue(0);
  const backgroundColor = useThemeColor({}, "background");
  const isLiquidGlass = isLiquidGlassAvailable();

  const scrollHandler = useAnimatedScrollHandler((event) => {
    animatedTranslateY.value = interpolate(
      event.contentOffset.y,
      [-HEADER_SCROLL_OFFSET, 0],
      [0, HEADER_SCROLL_OFFSET],
      Extrapolation.CLAMP
    );
  });

  const stickyHeaderStyle = useAnimatedStyle(() => {
    if (Platform.OS !== "ios") {
      return {};
    }

    return {
      transform: [{ translateY: animatedTranslateY.value }],
      backgroundColor: isLiquidGlass ? "transparent" : backgroundColor,
    };
  });

  const renderStickyHeader = useMemo(
    () => (
      <Animated.View style={stickyHeaderStyle}>
        <CategoryFilter category={category} onSelectCategory={setCategory} />
      </Animated.View>
    ),
    [category, stickyHeaderStyle]
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: "Stories",
          headerShown: true,
          headerLargeTitle: true,
        }}
      />
      <AnimatedFlatList<HNItem | null>
        ref={flatListRef}
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
        scrollToOverflowEnabled
        ListHeaderComponent={renderStickyHeader}
        stickyHeaderIndices={[0]}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
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
