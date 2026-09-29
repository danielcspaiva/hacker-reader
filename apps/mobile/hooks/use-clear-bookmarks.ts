import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { useBookmarkIds } from "@/hooks/use-bookmarks";
import { clearBookmarks } from "@/lib/bookmarks";
import { reportError } from "@/lib/observability";

export function useClearBookmarks() {
  const queryClient = useQueryClient();
  const { data: bookmarkIds = [] } = useBookmarkIds();
  const [isClearing, setIsClearing] = useState(false);

  const bookmarkCount = bookmarkIds.length;

  const clearBookmarksLabel =
    bookmarkCount === 0
      ? "Clear Bookmarks"
      : `Clear ${bookmarkCount} ${bookmarkCount === 1 ? "Bookmark" : "Bookmarks"}`;

  const clearAll = async () => {
    try {
      setIsClearing(true);
      await clearBookmarks();
      queryClient.setQueryData<number[]>(["bookmarks"], []);
      queryClient.setQueryData(["bookmarks", "stories"], []);
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      queryClient.invalidateQueries({ queryKey: ["bookmark"] });
    } catch (error) {
      reportError(error, { operation: "clearBookmarks" });
    } finally {
      setIsClearing(false);
    }
  };

  return {
    bookmarkCount,
    clearBookmarksLabel,
    isClearing,
    clearAll,
  };
}
