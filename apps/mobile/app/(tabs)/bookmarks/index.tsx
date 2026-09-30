import type { FlashListRef } from "@shopify/flash-list";
import { Stack } from "expo-router";
import { useEffect, useRef } from "react";

import { ErrorState } from "@/components/error-state";
import { StoryCard } from "@/components/story-card";
import { StoryCardSkeleton } from "@/components/story-card-skeleton";
import { EmptyState, ICON_GLYPHS, ListScreen } from "@/components/ui";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useClearBookmarks } from "@/hooks/use-clear-bookmarks";
import { confirmDestructive } from "@/lib/confirm-destructive";
import { type HNItem } from "@/lib/hn";

export default function BookmarksScreen() {
  const {
    data: stories = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useBookmarks();
  const { bookmarkCount, isClearing, clearAll } = useClearBookmarks();
  const listRef = useRef<FlashListRef<HNItem>>(null);
  const previousCountRef = useRef(stories.length);

  useEffect(() => {
    if (stories.length > previousCountRef.current && stories.length > 0) {
      listRef.current?.scrollToTop({ animated: true });
    }
    previousCountRef.current = stories.length;
  }, [stories.length]);

  const confirmClearAll = () => {
    const noun = bookmarkCount === 1 ? "bookmark" : "bookmarks";
    confirmDestructive({
      title: `Remove ${bookmarkCount} ${noun}?`,
      message:
        "This removes every saved story from this device. It can't be undone.",
      confirmLabel: "Remove All",
      onConfirm: clearAll,
    });
  };

  const toolbar =
    stories.length > 0 ? (
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu
          icon={ICON_GLYPHS.more.ios}
          accessibilityLabel="Bookmark options"
        >
          <Stack.Toolbar.MenuAction
            icon={ICON_GLYPHS.trash.ios}
            destructive
            disabled={isClearing}
            onPress={confirmClearAll}
          >
            Clear All Bookmarks
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
    ) : null;

  return (
    <>
      {toolbar}
      <ListScreen<HNItem>
        listRef={listRef}
        data={stories}
        isLoading={isLoading}
        skeleton={<StoryCardSkeleton />}
        skeletonCount={4}
        renderItem={({ item }) => <StoryCard story={item} />}
        keyExtractor={(item) => item.id.toString()}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        empty={
          isError ? (
            <ErrorState
              title="Couldn't load bookmarks"
              onRetry={() => void refetch()}
            />
          ) : (
            <EmptyState
              icon="bookmark"
              title="No Bookmarks Yet"
              message="Tap the bookmark button on a story, or long press it in the feed, to save it here for later."
            />
          )
        }
      />
    </>
  );
}
