import { FlashList, FlashListRef } from "@shopify/flash-list";
import { useEffect, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/empty-state";
import { NativeProgress } from "@/components/native-progress";
import { StoryCard } from "@/components/story-card";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { hapticImpact } from "@/lib/haptics";
import { type HNItem } from "@/lib/shared";

export default function BookmarksScreen() {
  const {
    data: stories = [],
    isLoading,
    refetch,
    isRefetching,
  } = useBookmarks();
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
        <NativeProgress />
      </View>
    );
  }

  if (stories.length === 0) {
    return (
      <EmptyState
        title="No bookmarks yet"
        description="Long press on any story to bookmark it"
        systemImage="bookmark"
      />
    );
  }

  return (
    <FlashList<HNItem>
      ref={listRef}
      data={stories}
      ListHeaderComponent={<View style={{ paddingTop: 16 }} />}
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
      }}
      onRefresh={() => {
        // Only trigger refetch if not already loading or refetching
        if (!isLoading && !isRefetching) {
          hapticImpact();
          refetch();
        }
      }}
      refreshing={isRefetching}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
