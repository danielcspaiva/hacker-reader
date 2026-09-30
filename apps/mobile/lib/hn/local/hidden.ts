/** Hidden story ids, persisted in AsyncStorage. */

import AsyncStorage from "@react-native-async-storage/async-storage";

import { createJsonListStore } from "./json-list-store";

export const HIDDEN_STORIES_KEY = "@hidden_stories";

const store = createJsonListStore({
  key: HIDDEN_STORIES_KEY,
  guard: (id): id is number => typeof id === "number",
  storage: AsyncStorage,
});

/** Throws if storage fails. */
export function getHiddenIds(): Promise<number[]> {
  return store.read();
}

/** Resolves to the list that was written. */
export function hideId(id: number): Promise<number[]> {
  return store.update((ids) => (ids.includes(id) ? ids : [...ids, id]));
}

/** Replaces the list (iCloud sync applying merged changes). */
export async function replaceHiddenIds(ids: number[]): Promise<void> {
  await store.update(() => ids);
}

export function clearHiddenIds(): Promise<void> {
  return store.clear();
}
