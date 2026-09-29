/** Voted item ids, persisted in AsyncStorage. */

import AsyncStorage from "@react-native-async-storage/async-storage";

import { createJsonListStore } from "./json-list-store";

const VOTES_STORAGE_KEY = "hn-votes";

const store = createJsonListStore({
  key: VOTES_STORAGE_KEY,
  guard: (id): id is number => typeof id === "number",
  storage: AsyncStorage,
});

/** Throws if storage fails. */
export function getVotedIds(): Promise<number[]> {
  return store.read();
}

export async function addVote(itemId: number): Promise<void> {
  await store.update((ids) => (ids.includes(itemId) ? ids : [...ids, itemId]));
}

export async function removeVote(itemId: number): Promise<void> {
  await store.update((ids) => ids.filter((id) => id !== itemId));
}
