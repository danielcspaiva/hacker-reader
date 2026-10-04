import type { ViewToken } from "@shopify/flash-list";
import { useQueryClient } from "@tanstack/react-query";

import { prefetchStory } from "@/hooks/use-story";
import type { HNItem } from "@/lib/hn";

/**
 * FlashList reads this once, when the list mounts. A row counts once a fifth of
 * it has been on screen for 200ms, so a fling does not prefetch every card it
 * passes.
 */
export const visibleStoryViewability = {
  itemVisiblePercentThreshold: 20,
  minimumViewTime: 200,
};

/** Id of a row that opens story detail. Comments and poll options do not. */
export function visibleStoryId(item: HNItem): number | undefined {
  if (item.deleted || item.type === "comment" || item.type === "pollopt") {
    return undefined;
  }
  return item.id;
}

/**
 * Prefetch story detail for rows that are actually on screen. Spread the
 * result onto a FlashList (`ListScreen` forwards both props).
 */
export function usePrefetchVisibleStories<T>(
  storyId: (item: T) => number | undefined
) {
  const queryClient = useQueryClient();

  return {
    viewabilityConfig: visibleStoryViewability,
    onViewableItemsChanged: ({ changed }: { changed: ViewToken<T>[] }) => {
      for (const token of changed) {
        if (!token.isViewable || token.item == null) continue;
        const id = storyId(token.item);
        if (id === undefined) continue;
        void prefetchStory(queryClient, id);
      }
    },
  };
}
