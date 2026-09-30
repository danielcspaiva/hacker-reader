import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { useBookmarkIds } from "@/hooks/use-bookmarks";
import { hnKeys } from "@/lib/hn";
import { clearBookmarks } from "@/lib/hn/local/bookmarks";
import { reportError } from "@/lib/observability/report-error";
import { syncBookmarksWidget } from "@/lib/widgets/sync";

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
      queryClient.setQueryData<number[]>(hnKeys.bookmarks(), []);
      queryClient.setQueryData(hnKeys.bookmarkedStories(), []);
      queryClient.invalidateQueries({ queryKey: hnKeys.bookmarks() });
      syncBookmarksWidget({ force: true });
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
