import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { Query, QueryClient } from "@tanstack/react-query";
import type { PersistedClient } from "@tanstack/react-query-persist-client";

import { APP_VERSION } from "@/constants/app-config";
import { hnKeys } from "@/lib/hn/read/keys";
import { reportError } from "@/lib/observability/report-error";

import {
  PERSIST_MAX_AGE_MS,
  PersistedCacheTooLargeError,
  persistBuster,
  selectPersistedStoryIds,
  serializeWithinLimit,
  shouldPersistQuery,
  storyQueryEntries,
  trimPersistedData,
} from "./persist-policy";

export const PERSIST_BUSTER = persistBuster(APP_VERSION);

let reportedTooLarge = false;

/** Disk copy of the query cache, throttled, never over the size budget. */
export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "hn-query-cache",
  throttleTime: 2000,
  serialize: (client: PersistedClient) => {
    try {
      return serializeWithinLimit(client);
    } catch (error) {
      // Skip this write (the persister swallows the throw); report once.
      if (error instanceof PersistedCacheTooLargeError && !reportedTooLarge) {
        reportedTooLarge = true;
        reportError(error, { chars: error.chars });
      }
      throw error;
    }
  },
});

/** `persistOptions.dehydrateOptions`, driven by the policy and the live cache. */
export function createDehydrateOptions(queryClient: QueryClient) {
  return {
    shouldDehydrateQuery: (query: Query) => {
      const storyIds = selectPersistedStoryIds(
        storyQueryEntries(queryClient.getQueryCache().getAll()),
        queryClient.getQueryData<number[]>(hnKeys.bookmarks()) ?? []
      );
      return shouldPersistQuery(query, storyIds);
    },
    serializeData: trimPersistedData,
  };
}

/**
 * Restored queries are built from the client defaults, whose 10 minute gcTime
 * would evict them (and so their disk copy) long before `maxAge`.
 */
export function keepPersistedQueriesAlive(queryClient: QueryClient) {
  queryClient.setQueryDefaults(hnKeys.allStories(), {
    gcTime: PERSIST_MAX_AGE_MS,
  });
  queryClient.setQueryDefaults(hnKeys.story(0).slice(0, 1), {
    gcTime: PERSIST_MAX_AGE_MS,
  });
}
