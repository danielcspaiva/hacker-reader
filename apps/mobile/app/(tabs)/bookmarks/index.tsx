import type { FlashListRef } from "@shopify/flash-list";
import { Stack } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import type { HeaderBarButtonItem } from "react-native-screens";

import { ErrorState } from "@/components/error-state";
import { useSplitHeaderOptions } from "@/components/navigation/header-options";
import { toolbarIcon } from "@/components/navigation/toolbar-icon";
import { StoryCard } from "@/components/story-card";
import { StoryCardSkeleton } from "@/components/story-card-skeleton";
import { StorySplitView } from "@/components/story/story-split-view";
import { EmptyState, ICON_GLYPHS, ListScreen } from "@/components/ui";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useClearBookmarks } from "@/hooks/use-clear-bookmarks";
import {
  usePrefetchVisibleStories,
  visibleStoryId,
} from "@/hooks/use-prefetch-visible-stories";
import { useWideLayout } from "@/hooks/use-wide-layout";
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
  const prefetchVisibleStories = usePrefetchVisibleStories(visibleStoryId);
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

  const columnChrome = useWideLayout() && Platform.OS === "ios";
  const clearItem: HeaderBarButtonItem = {
    type: "menu",
    icon: { type: "sfSymbol", name: ICON_GLYPHS.more.ios },
    accessibilityLabel: "Bookmark options",
    menu: {
      items: [
        {
          type: "action",
          title: "Clear All Bookmarks",
          icon: { type: "sfSymbol", name: ICON_GLYPHS.trash.ios },
          destructive: true,
          disabled: isClearing,
          onPress: confirmClearAll,
        },
      ],
    },
  };
  const toolbar =
    stories.length > 0 ? (
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu
          icon={toolbarIcon("more")}
          iconRenderingMode="template"
          accessibilityLabel="Bookmark options"
        >
          <Stack.Toolbar.MenuAction
            icon={toolbarIcon("trash")}
            destructive
            disabled={isClearing}
            onPress={confirmClearAll}
          >
            Clear All Bookmarks
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
    ) : null;

  const splitHeader = useSplitHeaderOptions("Bookmarks");

  return (
    <>
      <Stack.Screen options={{ ...splitHeader }} />
      {columnChrome ? null : toolbar}
      <StorySplitView
        title="Bookmarks"
        headerRightItems={
          columnChrome && stories.length > 0 ? [clearItem] : undefined
        }
      >
        <ListScreen<HNItem>
          listRef={listRef}
          {...prefetchVisibleStories}
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
      </StorySplitView>
    </>
  );
}
