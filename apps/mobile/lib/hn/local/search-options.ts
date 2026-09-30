/** The chosen search sort, scope and filters, persisted in AsyncStorage. */

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  DEFAULT_SEARCH_OPTIONS,
  parseSearchOptions,
  type SearchOptions,
  type StoredSearchOptions,
} from "../read/search-params";
import { createJsonListStore } from "./json-list-store";

const SEARCH_OPTIONS_KEY = "@search_options";

// One record, stored as a single-element list so it shares the store's
// read-failure and write-queue guarantees.
const store = createJsonListStore({
  key: SEARCH_OPTIONS_KEY,
  guard: (value): value is StoredSearchOptions => value instanceof Object,
  storage: AsyncStorage,
});

/** Defaults when nothing is stored. Throws if storage fails. */
export async function getSearchOptions(): Promise<SearchOptions> {
  const [stored] = await store.read();
  return stored ? parseSearchOptions(stored) : DEFAULT_SEARCH_OPTIONS;
}

/** Resolves to the options that were written. */
export async function saveSearchOptions(
  options: SearchOptions
): Promise<SearchOptions> {
  await store.update(() => [options]);
  return options;
}
