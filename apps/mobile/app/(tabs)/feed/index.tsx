import {
  Button,
  Host,
  HStack,
  Image as SwiftImage,
  Menu,
  Text,
} from "@expo/ui/swift-ui";
import { buttonStyle, menuStyle } from "@expo/ui/swift-ui/modifiers";
import { Stack } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import {
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  type Category,
} from "@/components/category-filter";
import { EmptyState } from "@/components/empty-state";
import { NativeProgress } from "@/components/native-progress";
import { StoryCard } from "@/components/story-card";
import { StoryCardSkeleton } from "@/components/story-card-skeleton";
import { useColorSchemeContext } from "@/contexts/color-scheme-context";
import { useFeedCategory } from "@/contexts/feed-category-context";
import { useAnalytics } from "@/hooks/use-analytics";
import { useBlockedUsers } from "@/hooks/use-blocked-users";
import { useHiddenStories } from "@/hooks/use-hidden-items";
import { STORY_CATEGORIES, useStories } from "@/hooks/use-stories";
import { useThemeColor } from "@/hooks/use-theme-color";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import { hapticImpact, hapticSelection } from "@/lib/haptics";
import { type HNItem } from "@/lib/shared";

export default function FeedScreen() {
  const { category, setCategory } = useFeedCategory();
  const analytics = useAnalytics();
  const { isHidden } = useHiddenStories();
  const { isBlocked } = useBlockedUsers();
  const { colorScheme } = useColorSchemeContext();

  const {
    data,
    isPending,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useStories(category);

  const allStories = data?.pages.flatMap((page) => page) ?? [];
  const stories = allStories.filter(
    (story) => !isHidden(story.id) && (!story.by || !isBlocked(story.by))
  );

  const { bottom, top } = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, "background");
  const flatListRef = useRef<FlatList>(null);
  const scrollOffsetY = useRef(0);

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

  const handleSelectCategory = useCallback(
    (newCategory: Category) => {
      if (newCategory === category) return;
      hapticSelection();
      analytics.track(AnalyticsEvent.CATEGORY_CHANGED, {
        [AnalyticsProperty.FROM_CATEGORY]: category,
        [AnalyticsProperty.TO_CATEGORY]: newCategory,
      });
      setCategory(newCategory);

      if (scrollOffsetY.current > 10) {
        flatListRef.current?.scrollToOffset({
          offset: -30 - top,
          animated: true,
        });
      }
    },
    [analytics, category, setCategory, top]
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: CATEGORY_LABELS[category],
          headerShown: true,
          headerLargeTitle: true,
          unstable_headerLeftItems: () => [
            {
              type: "custom",
              hidesSharedBackground: true,
              element: (
                <Pressable
                  accessibilityLabel="Hacker Reader"
                  onPress={() => {
                    flatListRef.current?.scrollToOffset({
                      offset: -30 - top,
                      animated: true,
                    });
                  }}
                  hitSlop={8}
                >
                  <Image
                    source={require("@/assets/images/ybook.png")}
                    style={styles.logo}
                  />
                </Pressable>
              ),
            },
          ],
          headerRight: () => (
            <Host matchContents colorScheme={colorScheme}>
              <Menu
                label={
                  <HStack spacing={6}>
                    <SwiftImage systemName={CATEGORY_ICONS[category]} />
                    <Text>{CATEGORY_LABELS[category]}</Text>
                  </HStack>
                }
                modifiers={[menuStyle("button"), buttonStyle("plain")]}
              >
                {STORY_CATEGORIES.map((cat) => (
                  <Button
                    key={cat}
                    label={CATEGORY_LABELS[cat]}
                    systemImage={
                      cat === category ? "checkmark" : CATEGORY_ICONS[cat]
                    }
                    onPress={() => handleSelectCategory(cat)}
                  />
                ))}
              </Menu>
            </Host>
          ),
        }}
      />
      <FlatList<HNItem | null>
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
        onScrollBeginDrag={(e) => {
          scrollOffsetY.current = e.nativeEvent.contentOffset.y;
        }}
        style={{ backgroundColor }}
        contentContainerStyle={{
          paddingTop: 0,
          paddingBottom: Platform.select({
            android: 100 + bottom,
            default: 0,
          }),
        }}
        onRefresh={() => {
          if (!isPending && !isRefetching) {
            hapticImpact();
            refetch();
          }
        }}
        refreshing={isRefetching && !isPending}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage && !isPending) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <EmptyState title="No stories found" systemImage="newspaper" />
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footer}>
              <NativeProgress size="small" />
            </View>
          ) : undefined
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 32,
    height: 32,
  },
  footer: {
    paddingVertical: 20,
    alignItems: "center",
  },
});
