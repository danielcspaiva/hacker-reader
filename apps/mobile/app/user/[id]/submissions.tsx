import { StoryCard } from "@/components/story-card";
import { SubmissionCommentCard } from "@/components/submission-comment-card";
import {
  SubmissionTypeFilter,
  type SubmissionType,
} from "@/components/submission-type-filter";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useUser } from "@/hooks/use-user";
import { useUserSubmissions } from "@/hooks/use-user-submissions";
import type { HNItem } from "@/lib/shared/types";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
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

const AnimatedFlatList = Animated.FlatList;

const HEADER_SCROLL_OFFSET = isLiquidGlassAvailable() ? 100 : 90;

export default function UserSubmissionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selectedType, setSelectedType] = useState<SubmissionType>("stories");
  const { data: user, isLoading: isLoadingUser } = useUser(id);
  const { data: submissions, isLoading: isLoadingSubmissions } =
    useUserSubmissions(user?.submitted);

  const { bottom, top } = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");

  const isLoading = isLoadingUser || isLoadingSubmissions;

  // Separate stories and comments
  const stories = Array.isArray(submissions)
    ? submissions.filter(
        (item) => item.type === "story" && !item.deleted && !item.dead
      )
    : [];

  const comments = Array.isArray(submissions)
    ? submissions.filter(
        (item) => item.type === "comment" && !item.deleted && !item.dead
      )
    : [];

  // Get current items based on selected type
  const currentItems = selectedType === "stories" ? stories : comments;

  // Animation setup for sticky header
  const flatListRef = useRef<FlatList>(null);
  const animatedTranslateY = useSharedValue(0);
  const isScrolledDown = useSharedValue(false);
  const isLiquidGlass = isLiquidGlassAvailable();

  const scrollHandler = useAnimatedScrollHandler((event) => {
    animatedTranslateY.value = interpolate(
      event.contentOffset.y,
      [-HEADER_SCROLL_OFFSET, 0],
      [0, HEADER_SCROLL_OFFSET],
      Extrapolation.CLAMP
    );

    isScrolledDown.value = event.contentOffset.y > 10;
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

  const handleSelectType = useCallback(
    (type: SubmissionType) => {
      setSelectedType(type);

      // Scroll to top if user has scrolled down
      if (isScrolledDown.value) {
        flatListRef.current?.scrollToOffset({
          offset: -30 - top,
          animated: true,
        });
      }
    },
    [isScrolledDown, top]
  );

  const renderStickyHeader = useMemo(
    () => (
      <Animated.View style={stickyHeaderStyle}>
        <SubmissionTypeFilter
          submissionType={selectedType}
          onSelectType={handleSelectType}
        />
      </Animated.View>
    ),
    [handleSelectType, selectedType, stickyHeaderStyle]
  );

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: `${id}'s Submissions` }} />
        <View style={[styles.centered, { backgroundColor }]}>
          <ActivityIndicator size="large" color={textColor} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `${id}'s Submissions`,
          headerShown: true,
          headerBackButtonDisplayMode: "minimal",
          headerTransparent: true,
        }}
      />
      <AnimatedFlatList<HNItem>
        ref={flatListRef}
        data={currentItems}
        ListHeaderComponent={renderStickyHeader}
        stickyHeaderIndices={[0]}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        style={{ backgroundColor }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>
              {selectedType === "stories"
                ? "No stories yet"
                : "No comments yet"}
            </ThemedText>
          </View>
        }
        renderItem={({ item, index }) => {
          if (item.type === "story") {
            return <StoryCard story={item} index={index + 1} />;
          }
          if (item.type === "comment") {
            return <SubmissionCommentCard comment={item} />;
          }
          return null;
        }}
        keyExtractor={(item) => item.id.toString()}
        contentInsetAdjustmentBehavior="automatic"
        scrollToOverflowEnabled
        contentContainerStyle={{
          paddingBottom: Platform.select({
            android: 100 + bottom,
            default: 0,
          }),
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.6,
  },
});
