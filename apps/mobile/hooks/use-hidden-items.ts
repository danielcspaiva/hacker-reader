/**
 * Hidden Items Hook
 *
 * Manages hidden stories and comments for content filtering.
 * Stores hidden item IDs in AsyncStorage for persistence.
 * Uses React Query for state management and cache invalidation.
 */

import { reportError } from "@/lib/observability";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

const HIDDEN_STORIES_KEY = "@hidden_stories";
const HIDDEN_COMMENTS_KEY = "@hidden_comments";

type ItemType = "story" | "comment";

/**
 * Load hidden IDs from AsyncStorage
 */
async function loadHiddenIds(storageKey: string): Promise<number[]> {
  try {
    const stored = await AsyncStorage.getItem(storageKey);
    if (!stored) return [];

    // Validate at the boundary: keep only numeric IDs from the parsed array.
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is number => typeof id === "number")
      : [];
  } catch (error) {
    reportError(error, { operation: "loadHiddenIds", storageKey });
    return [];
  }
}

/**
 * Save hidden IDs to AsyncStorage
 */
async function saveHiddenIds(storageKey: string, ids: number[]): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey, JSON.stringify(ids));
  } catch (error) {
    reportError(error, { operation: "saveHiddenIds", storageKey });
  }
}

/**
 * Hook for managing hidden items (stories or comments)
 */
export function useHiddenItems(type: ItemType) {
  const queryClient = useQueryClient();
  const storageKey =
    type === "story" ? HIDDEN_STORIES_KEY : HIDDEN_COMMENTS_KEY;
  const queryKey = type === "story" ? ["hidden-stories"] : ["hidden-comments"];

  // Load hidden IDs using React Query
  const { data: hiddenIds = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => loadHiddenIds(storageKey),
    staleTime: Number.POSITIVE_INFINITY, // Never goes stale (local data)
  });

  // Hide item mutation
  const hideItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const newHiddenIds = [...hiddenIds, itemId];
      await saveHiddenIds(storageKey, newHiddenIds);
      return newHiddenIds;
    },
    onSuccess: (newHiddenIds) => {
      queryClient.setQueryData(queryKey, newHiddenIds);
      // Invalidate stories queries to trigger re-render
      queryClient.invalidateQueries({ queryKey: ["stories"] });
    },
  });

  // Unhide item mutation
  const unhideItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const newHiddenIds = hiddenIds.filter((id) => id !== itemId);
      await saveHiddenIds(storageKey, newHiddenIds);
      return newHiddenIds;
    },
    onSuccess: (newHiddenIds) => {
      queryClient.setQueryData(queryKey, newHiddenIds);
      // Invalidate stories queries to trigger re-render
      queryClient.invalidateQueries({ queryKey: ["stories"] });
    },
  });

  // Clear all mutation
  const clearAllMutation = useMutation({
    mutationFn: async () => {
      await AsyncStorage.removeItem(storageKey);
      return [];
    },
    onSuccess: (newHiddenIds) => {
      queryClient.setQueryData(queryKey, newHiddenIds);
      // Invalidate stories queries to trigger re-render
      queryClient.invalidateQueries({ queryKey: ["stories"] });
    },
  });

  const isHidden = useCallback(
    (itemId: number) => hiddenIds.includes(itemId),
    [hiddenIds]
  );

  const hideItem = useCallback(
    async (itemId: number) => {
      // Don't hide if already hidden
      if (hiddenIds.includes(itemId)) {
        return;
      }
      await hideItemMutation.mutateAsync(itemId);
    },
    [hiddenIds, hideItemMutation]
  );

  const unhideItem = useCallback(
    async (itemId: number) => {
      await unhideItemMutation.mutateAsync(itemId);
    },
    [unhideItemMutation]
  );

  const clearAll = useCallback(async () => {
    await clearAllMutation.mutateAsync();
  }, [clearAllMutation]);

  return {
    hiddenIds,
    isHidden,
    hideItem,
    unhideItem,
    clearAll,
    isLoading,
    count: hiddenIds.length,
  };
}

/**
 * Hook specifically for hidden stories
 */
export function useHiddenStories() {
  return useHiddenItems("story");
}

/**
 * Hook specifically for hidden comments
 */
export function useHiddenComments() {
  return useHiddenItems("comment");
}
