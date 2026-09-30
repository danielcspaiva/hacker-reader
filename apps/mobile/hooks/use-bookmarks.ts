import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { hapticImpact, Haptics } from "@/lib/haptics";
import { getItem, hnKeys, type HNItem } from "@/lib/hn";
import {
  addBookmark,
  getBookmarkIds,
  removeBookmark,
} from "@/lib/hn/local/bookmarks";
import { reportError } from "@/lib/observability/report-error";
import { syncBookmarksWidget } from "@/lib/widgets/sync";

async function readBookmarkIds(): Promise<number[]> {
  try {
    return await getBookmarkIds();
  } catch (error) {
    reportError(error, { operation: "getBookmarkIds" });
    throw error;
  }
}

const bookmarkIdsOptions = {
  queryKey: hnKeys.bookmarks(),
  queryFn: readBookmarkIds,
  staleTime: 0, // Always fresh - we want to see updates immediately
  retry: false,
} as const;

/**
 * Hook to get all bookmarked story IDs
 */
export function useBookmarkIds() {
  return useQuery<number[], Error>(bookmarkIdsOptions);
}

/**
 * Hook to get all bookmarked stories with full data
 */
export function useBookmarks() {
  const queryClient = useQueryClient();

  return useQuery<HNItem[], Error>({
    queryKey: hnKeys.bookmarkedStories(),
    queryFn: async ({ signal }) => {
      const ids = await readBookmarkIds();

      // Fetch stories in parallel, trying cache first. One failed fetch must
      // not empty the whole list, so settle them all and only fail when none
      // resolved.
      const settled = await Promise.allSettled(
        ids.map(async (id) => {
          // Try to get from cache first
          const cached = queryClient.getQueryData<HNItem>(hnKeys.item(id));
          if (cached) return cached;

          // Fetch from API if not cached
          const item = await getItem(id, signal);
          if (item) queryClient.setQueryData(hnKeys.item(id), item);
          return item;
        })
      );

      const failed = settled.find(
        (r): r is PromiseRejectedResult => r.status === "rejected"
      );
      if (failed && settled.every((r) => r.status === "rejected")) {
        throw failed.reason;
      }
      return settled.flatMap((r) =>
        r.status === "fulfilled" && r.value ? [r.value] : []
      );
    },
    staleTime: 0, // Always fresh
    retry: false,
  });
}

/**
 * Whether a story is bookmarked, derived from the shared bookmark-id list.
 */
export function useIsBookmarked(storyId: number) {
  return useQuery<number[], Error, boolean>({
    ...bookmarkIdsOptions,
    select: (ids) => ids.includes(storyId),
  });
}

/**
 * Hook to add/remove bookmarks with optimistic updates
 */
export function useBookmarkMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ storyId, add }: { storyId: number; add: boolean }) => {
      if (add) {
        await addBookmark(storyId);
      } else {
        await removeBookmark(storyId);
      }
    },
    onMutate: async ({ storyId, add }) => {
      // Haptic feedback for instant user feedback
      hapticImpact(Haptics.ImpactFeedbackStyle.Medium);

      await queryClient.cancelQueries({ queryKey: hnKeys.bookmarks() });
      const previousIds = queryClient.getQueryData<number[]>(
        hnKeys.bookmarks()
      );

      queryClient.setQueryData<number[]>(hnKeys.bookmarks(), (old = []) =>
        add ? [storyId, ...old] : old.filter((id) => id !== storyId)
      );

      return { previousIds };
    },
    onError: (error, { storyId }, context) => {
      if (context?.previousIds) {
        queryClient.setQueryData(hnKeys.bookmarks(), context.previousIds);
      }
      reportError(error, { operation: "bookmark", storyId });
    },
    onSuccess: () => {
      // Keep the Bookmarks home screen widget in step with the list.
      syncBookmarksWidget({ force: true });
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: hnKeys.bookmarks() });
    },
  });
}
