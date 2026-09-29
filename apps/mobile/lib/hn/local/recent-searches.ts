/** Recent search terms, most recent first, persisted in AsyncStorage. */

import AsyncStorage from "@react-native-async-storage/async-storage";

import { createJsonListStore } from "./json-list-store";

const RECENT_SEARCHES_KEY = "@recent_searches";
export const MAX_RECENT_SEARCHES = 8;

const store = createJsonListStore({
  key: RECENT_SEARCHES_KEY,
  guard: (term): term is string => typeof term === "string",
  storage: AsyncStorage,
});

/** Puts `term` first, dropping a case-insensitive duplicate and the overflow. */
export function withRecentSearch(terms: string[], term: string): string[] {
  const lower = term.toLowerCase();
  return [term, ...terms.filter((item) => item.toLowerCase() !== lower)].slice(
    0,
    MAX_RECENT_SEARCHES
  );
}

/** Throws if storage fails. */
export function getRecentSearches(): Promise<string[]> {
  return store.read();
}

/** Resolves to the list that was written. */
export function addRecentSearch(term: string): Promise<string[]> {
  return store.update((terms) => withRecentSearch(terms, term));
}

export function clearRecentSearches(): Promise<void> {
  return store.clear();
}
