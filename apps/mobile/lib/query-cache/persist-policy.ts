import { STORY_CATEGORIES } from "../hn/constants";
import { hnKeys } from "../hn/read/keys";

/**
 * What the on-disk React Query cache keeps. Pure (no React Native imports) so
 * node tests can pin it; `persister.ts` wires it into the app.
 */

/** Saved copies older than this are dropped on restore. */
export const PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Bump to drop every installed app's saved cache (shape changes). */
export const PERSIST_SCHEMA_VERSION = 1;

/** Feed pages kept per category; older pages reload on scroll. */
export const MAX_PERSISTED_FEED_PAGES = 2;

/** Most recently opened stories kept besides the bookmarked ones. */
export const MAX_PERSISTED_RECENT_STORIES = 20;

/** Stay well under Android AsyncStorage's 6MB total. */
export const MAX_PERSISTED_CACHE_CHARS = 4 * 1024 * 1024;

export function persistBuster(appVersion: string): string {
  return `${appVersion}:${PERSIST_SCHEMA_VERSION}`;
}

// The `story` key's prefix, taken from the factory so a key change can't
// silently stop persisting it.
const STORIES_ROOT = hnKeys.allStories()[0];
const STORY_ROOT = hnKeys.story(0)[0];

export interface PersistableQuery {
  queryKey: readonly unknown[];
  state: { status: string; dataUpdatedAt: number };
}

/** Ids of the stories whose threads are saved: bookmarks plus the latest opened. */
export function selectPersistedStoryIds(
  storyQueries: readonly { id: number; dataUpdatedAt: number }[],
  bookmarkedIds: readonly number[],
  limit: number = MAX_PERSISTED_RECENT_STORIES
): Set<number> {
  const recent = [...storyQueries]
    .sort((a, b) => b.dataUpdatedAt - a.dataUpdatedAt)
    .slice(0, limit)
    .map((q) => q.id);
  return new Set([...bookmarkedIds, ...recent]);
}

function isStoryKey(key: readonly unknown[]): key is ["story", number] {
  return key.length === 2 && key[0] === STORY_ROOT && Number.isInteger(key[1]);
}

function isFeedKey(key: readonly unknown[]): boolean {
  return (
    key.length === 2 &&
    key[0] === STORIES_ROOT &&
    STORY_CATEGORIES.some((category) => category === key[1])
  );
}

/** The successful `story` queries, as (id, freshness) for the selection above. */
export function storyQueryEntries(
  queries: readonly PersistableQuery[]
): { id: number; dataUpdatedAt: number }[] {
  return queries.flatMap((q) =>
    isStoryKey(q.queryKey) && q.state.status === "success"
      ? [{ id: q.queryKey[1], dataUpdatedAt: q.state.dataUpdatedAt }]
      : []
  );
}

/**
 * Only successful feed lists and the chosen story threads are saved. The local
 * stores (bookmarks, votes, read, mutes, ...) are cheap to re-read; auth,
 * search, previews, item lookups and everything else reload on demand.
 */
export function shouldPersistQuery(
  query: PersistableQuery,
  persistedStoryIds: ReadonlySet<number>
): boolean {
  if (query.state.status !== "success") return false;
  const key = query.queryKey;
  if (isFeedKey(key)) return true;
  return isStoryKey(key) && persistedStoryIds.has(key[1]);
}

interface InfiniteLike {
  pages?: readonly object[];
  pageParams?: readonly number[];
}

/**
 * Keeps the first pages of an infinite query and passes any other data through
 * (`dehydrateOptions.serializeData`, which sees every query's data).
 */
export function trimPersistedData<T extends InfiniteLike>(
  data: T,
  maxPages: number = MAX_PERSISTED_FEED_PAGES
): T {
  const { pages, pageParams } = data;
  if (!Array.isArray(pages) || pages.length <= maxPages) return data;
  return {
    ...data,
    pages: pages.slice(0, maxPages),
    pageParams: pageParams?.slice(0, maxPages),
  };
}

export class PersistedCacheTooLargeError extends Error {
  readonly chars: number;
  constructor(chars: number, maxChars: number) {
    super(`Query cache is ${chars} chars, over the ${maxChars} limit`);
    this.name = "PersistedCacheTooLargeError";
    this.chars = chars;
  }
}

/** JSON for the disk write; throws instead of returning an oversized payload. */
export function serializeWithinLimit<T>(
  value: T,
  maxChars: number = MAX_PERSISTED_CACHE_CHARS
): string {
  const serialized = JSON.stringify(value);
  if (serialized.length > maxChars) {
    throw new PersistedCacheTooLargeError(serialized.length, maxChars);
  }
  return serialized;
}

/** The parts of a persisted client that `fitWithinLimit` looks at. */
export interface PersistedClientLike {
  clientState: {
    queries: readonly {
      queryKey: readonly unknown[];
      state: { dataUpdatedAt: number };
    }[];
  };
}

/**
 * JSON for the disk write. When it is over budget, story threads are dropped
 * oldest first until it fits, so one huge thread never stops the feeds from
 * being saved. Throws only when the feeds alone are over budget.
 */
export function fitWithinLimit<T extends PersistedClientLike>(
  client: T,
  maxChars: number = MAX_PERSISTED_CACHE_CHARS
): string {
  let serialized = JSON.stringify(client);
  if (serialized.length <= maxChars) return serialized;

  const stories = client.clientState.queries
    .filter((q) => isStoryKey(q.queryKey))
    .sort((a, b) => a.state.dataUpdatedAt - b.state.dataUpdatedAt);
  const dropped = new Set<(typeof stories)[number]>();
  for (const story of stories) {
    dropped.add(story);
    serialized = JSON.stringify({
      ...client,
      clientState: {
        ...client.clientState,
        queries: client.clientState.queries.filter((q) => !dropped.has(q)),
      },
    });
    if (serialized.length <= maxChars) return serialized;
  }
  throw new PersistedCacheTooLargeError(serialized.length, maxChars);
}
