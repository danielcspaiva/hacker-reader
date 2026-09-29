import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { FlatList, Platform, StyleSheet, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/empty-state";
import { NativeProgress } from "@/components/native-progress";
import { StoryCard } from "@/components/story-card";
import { SubmissionCommentCard } from "@/components/submission-comment-card";
import {
  SubmissionTypeFilter,
  type SubmissionType,
} from "@/components/submission-type-filter";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useUser } from "@/hooks/use-user";
import { useUserSubmissions } from "@/hooks/use-user-submissions";
import type { HNItem } from "@/lib/shared/types";

const AnimatedFlatList = Animated.FlatList;

const HEADER_SCROLL_OFFSET = isLiquidGlassAvailable() ? 100 : 90;

export function UserSubmissionsList({
  userId,
  title,
  screenOptions,
}: {
  userId: string | null;
  title: string;
  screenOptions?: {
    headerShown?: boolean;
    headerBackButtonDisplayMode?: "minimal" | "default" | "generic";
    headerTransparent?: boolean;
  };
}) {
  const [selectedType, setSelectedType] = useState<SubmissionType>("stories");
  const { data: user, isLoading: isLoadingUser } = useUser(userId ?? null);
  const { data: submissions, isLoading: isLoadingSubmissions } =
    useUserSubmissions(user?.submitted);

  const { bottom, top } = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, "background");

  const isLoading = isLoadingUser || isLoadingSubmissions;

  const stories = (submissions ?? []).filter((item) => item.type === "story");
  const comments = (submissions ?? []).filter(
    (item) => item.type === "comment"
  );

  const currentItems = selectedType === "stories" ? stories : comments;

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
        <Stack.Screen options={{ title, ...screenOptions }} />
        <View style={[styles.centered, { backgroundColor }]}>
          <NativeProgress />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title, ...screenOptions }} />
      <AnimatedFlatList<HNItem>
        ref={flatListRef}
        data={currentItems}
        ListHeaderComponent={renderStickyHeader}
        stickyHeaderIndices={[0]}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        style={{ backgroundColor }}
        ListEmptyComponent={
          <EmptyState
            title={
              selectedType === "stories" ? "No stories yet" : "No comments yet"
            }
            systemImage={
              selectedType === "stories" ? "doc.text" : "bubble.left"
            }
          />
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
