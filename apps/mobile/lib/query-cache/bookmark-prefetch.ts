/** Bookmark threads saved in the background when the Bookmarks tab opens. */
export const MAX_BOOKMARK_PREFETCH = 50;
export const BOOKMARK_PREFETCH_CONCURRENCY = 4;

/** Bookmarked ids (newest first) whose thread isn't cached yet, capped. */
export function selectThreadsToPrefetch(
  bookmarkIds: readonly number[],
  isCached: (id: number) => boolean,
  limit: number = MAX_BOOKMARK_PREFETCH
): number[] {
  return bookmarkIds.filter((id) => !isCached(id)).slice(0, limit);
}

/** Runs `worker` over `items`, at most `concurrency` at once. Never rejects. */
export async function runWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let next = 0;
  const lane = async () => {
    while (next < items.length) {
      const item = items[next++];
      try {
        await worker(item);
      } catch {
        // One failed thread must not stop the rest; the caller reports.
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, lane)
  );
}
