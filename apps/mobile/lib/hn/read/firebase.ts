import { FIREBASE_URL, type StoryCategory } from "../constants";
import { fetchJSON, isTransientFetchError } from "../fetch-json";
import type { HNItem, HNUser } from "../types";

const firebaseJSON = <T>(path: string, signal?: AbortSignal) =>
  fetchJSON<T>(FIREBASE_URL, path, "API error", signal);

const CATEGORY_ENDPOINTS: Record<StoryCategory, string> = {
  top: "/topstories.json",
  new: "/newstories.json",
  ask: "/askstories.json",
  show: "/showstories.json",
  jobs: "/jobstories.json",
};

/** One page of story IDs for a category (IDs only; resolve with getItems). */
export async function getCategoryStoryIds(
  category: StoryCategory,
  offset = 0,
  limit = 30,
  signal?: AbortSignal
): Promise<number[]> {
  const ids = await firebaseJSON<number[] | null>(
    CATEGORY_ENDPOINTS[category],
    signal
  );
  // Firebase can answer `null` for an empty list; that is "no stories", not a crash.
  if (!Array.isArray(ids)) return [];
  return ids.slice(offset, offset + limit);
}

/** Firebase answers `null` (not a 404) for missing or purged items. */
export async function getItem(
  id: number,
  signal?: AbortSignal
): Promise<HNItem | null> {
  return firebaseJSON<HNItem | null>(`/item/${id}.json`, signal);
}

/** Firebase answers `null` for unknown usernames. */
export async function getUser(
  id: string,
  signal?: AbortSignal
): Promise<HNUser | null> {
  return firebaseJSON<HNUser | null>(
    `/user/${encodeURIComponent(id)}.json`,
    signal
  );
}

/** One item, retried once when the failure looks transient (dropped connection, 5xx). */
async function getItemWithRetry(
  id: number,
  signal?: AbortSignal
): Promise<HNItem | null> {
  try {
    return await getItem(id, signal);
  } catch (error) {
    if (signal?.aborted || !isTransientFetchError(error)) throw error;
    return getItem(id, signal);
  }
}

/**
 * Resolve many items, keeping input order. One failed item (after a retry) or
 * a missing/purged one (`null`) is dropped rather than failing the page. When
 * EVERY fetch fails there is nothing to degrade to (offline, Firebase down),
 * so the error is thrown for React Query to surface and retry.
 */
export async function getItems(
  ids: number[],
  signal?: AbortSignal
): Promise<HNItem[]> {
  const results = await Promise.allSettled(
    ids.map((id) => getItemWithRetry(id, signal))
  );
  const firstFailure = results.find(
    (result): result is PromiseRejectedResult => result.status === "rejected"
  );
  if (firstFailure && results.every((r) => r.status === "rejected")) {
    throw firstFailure.reason;
  }
  return results.flatMap((result) =>
    result.status === "fulfilled" && result.value ? [result.value] : []
  );
}
