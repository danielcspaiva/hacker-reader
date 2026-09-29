import { FIREBASE_URL, type StoryCategory } from "../constants";
import { fetchJSON } from "../fetch-json";
import type { HNItem, HNUser } from "../types";

const firebaseJSON = <T>(path: string) =>
  fetchJSON<T>(FIREBASE_URL, path, "API error");

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
  limit = 30
): Promise<number[]> {
  const ids = await firebaseJSON<number[]>(CATEGORY_ENDPOINTS[category]);
  return ids.slice(offset, offset + limit);
}

/** Firebase answers `null` (not a 404) for missing or purged items. */
export async function getItem(id: number): Promise<HNItem | null> {
  return firebaseJSON<HNItem | null>(`/item/${id}.json`);
}

/** Firebase answers `null` for unknown usernames. */
export async function getUser(id: string): Promise<HNUser | null> {
  return firebaseJSON<HNUser | null>(`/user/${id}.json`);
}

export async function getItems(ids: number[]): Promise<HNItem[]> {
  // allSettled so one failed fetch (transient network error) doesn't reject
  // the whole page: degrade to the items we did get. `null` (missing/purged
  // item) is dropped too.
  const results = await Promise.allSettled(ids.map((id) => getItem(id)));
  return results.flatMap((result) =>
    result.status === "fulfilled" && result.value ? [result.value] : []
  );
}
