import { useBookmarkIds } from "@/hooks/use-bookmarks";
import { clearBookmarks } from "@/lib/bookmarks";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert } from "react-native";

/**
 * Hook for clearing all bookmarks with confirmation dialog.
 * Manages clearing state and provides user feedback.
 *
 * @returns Handler function, button label, and clearing state
 *
 * @example
 * ```tsx
 * function Settings() {
 *   const { handleClearBookmarks, clearBookmarksLabel, isClearing } = useClearBookmarks();
 *
 *   return (
 *     <Button
 *       onPress={handleClearBookmarks}
 *       disabled={isClearing}
 *     >
 *       {clearBookmarksLabel}
 *     </Button>
 *   );
 * }
 * ```
 */
export function useClearBookmarks() {
  const queryClient = useQueryClient();
  const { data: bookmarkIds = [] } = useBookmarkIds();
  const [isClearing, setIsClearing] = useState(false);

  const bookmarkCount = bookmarkIds.length;

  const clearBookmarksLabel = (() => {
    if (bookmarkCount === 0) return "Clear Bookmarks";
    const noun = bookmarkCount === 1 ? "Bookmark" : "Bookmarks";
    return `Clear ${bookmarkCount} ${noun}`;
  })();

  const handleClearBookmarks = () => {
    if (bookmarkCount === 0) {
      Alert.alert("No Bookmarks", "You don't have any bookmarks to clear.");
      return;
    }

    Alert.alert(
      "Clear All Bookmarks",
      `Are you sure you want to remove all ${bookmarkCount} bookmarks? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              setIsClearing(true);
              await clearBookmarks();
              queryClient.setQueryData<number[]>(["bookmarks"], []);
              queryClient.setQueryData(["bookmarks", "stories"], []);
              queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
              queryClient.invalidateQueries({ queryKey: ["bookmark"] });
              Alert.alert("Success", "All bookmarks cleared");
            } catch (error) {
              console.error("Error clearing bookmarks:", error);
              Alert.alert(
                "Error",
                "Something went wrong while clearing bookmarks."
              );
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  };

  return {
    handleClearBookmarks,
    clearBookmarksLabel,
    isClearing,
  };
}
