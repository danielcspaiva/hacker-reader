import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { useBookmarkIds } from "@/hooks/use-bookmarks";
import { useIsOffline } from "@/hooks/use-is-offline";
import { prefetchStoryThread } from "@/hooks/use-story";
import { hnKeys } from "@/lib/hn";
import {
  BOOKMARK_PREFETCH_CONCURRENCY,
  runWithConcurrency,
  selectThreadsToPrefetch,
} from "@/lib/query-cache/bookmark-prefetch";

/**
 * One-shot per mount: save the threads of bookmarks that aren't cached so they
 * read offline ("Download for Offline"). Up to 50, four at a time.
 */
export function useOfflineBookmarks() {
  const queryClient = useQueryClient();
  const { data: ids } = useBookmarkIds();
  const isOffline = useIsOffline();
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !ids || isOffline) return;
    started.current = true;
    const missing = selectThreadsToPrefetch(
      ids,
      (id) => queryClient.getQueryData(hnKeys.story(id)) !== undefined
    );
    void runWithConcurrency(missing, BOOKMARK_PREFETCH_CONCURRENCY, (id) =>
      prefetchStoryThread(queryClient, id)
    );
  }, [ids, isOffline, queryClient]);
}
