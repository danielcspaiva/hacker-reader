/**
 * The synced collections: one adapter per local store, binding its keys and
 * timestamps to the engine. Bookmarks, mutes, blocked users, hidden stories
 * and read state (only the 500 most recent entries leave the device).
 */

import {
  BLOCKED_USERS_KEY,
  getBlockedUsers,
  isBlockedUserRecord,
  replaceBlockedUsers,
  type BlockedUser,
} from "@/lib/hn/local/blocked-users";
import {
  BOOKMARKS_KEY,
  getBookmarkRecords,
  isBookmarkRecord,
  replaceBookmarks,
  type BookmarkedStory,
} from "@/lib/hn/local/bookmarks";
import {
  getHiddenIds,
  HIDDEN_STORIES_KEY,
  replaceHiddenIds,
} from "@/lib/hn/local/hidden";
import {
  getMutes,
  isMuteRecord,
  MUTES_KEY,
  replaceMutes,
} from "@/lib/hn/local/mutes";
import {
  getReadStories,
  READ_STORIES_KEY,
  replaceReadStories,
} from "@/lib/hn/local/read-stories";
import type { Mute } from "@/lib/hn/mutes-match";
import {
  isReadStoryEntry,
  MAX_READ_STORIES,
  type ReadStoryEntry,
} from "@/lib/hn/read-state";

import {
  syncCollection,
  type CollectionSyncResult,
  type SyncCollection,
  type SyncContext,
} from "./engine";

/** Only this many read entries are pushed: far below iCloud's 1 MB limits. */
export const SYNCED_READ_ENTRIES = 500;

export type CollectionId =
  | "bookmarks"
  | "mutes"
  | "blockedUsers"
  | "hidden"
  | "readStories";

export interface SyncedCollection {
  id: CollectionId;
  /** The AsyncStorage key of the local store (to notice local writes). */
  storageKey: string;
  /** The AsyncStorage key of the last-synced state. */
  baseKey: string;
  /** Syncs this collection (the record type stays inside the closure). */
  run(context: SyncContext): Promise<CollectionSyncResult>;
}

function define<T>(
  id: CollectionId,
  storageKey: string,
  collection: Omit<SyncCollection<T>, "name" | "cloudKey" | "baseKey">,
  isValid: (value: unknown) => value is T
): SyncedCollection {
  const full: SyncCollection<T> = {
    name: id,
    cloudKey: `hr.sync.${id}`,
    baseKey: `@icloud_sync_base_${id}`,
    ...collection,
  };
  return {
    id,
    storageKey,
    baseKey: full.baseKey,
    run: (context) => syncCollection(full, context, isValid),
  };
}

const bookmarks = define<BookmarkedStory>(
  "bookmarks",
  BOOKMARKS_KEY,
  {
    read: getBookmarkRecords,
    write: replaceBookmarks,
    keyOf: (item) => String(item.id),
    timestampOf: (item) => item.bookmarkedAt,
  },
  isBookmarkRecord
);

const mutes = define<Mute>(
  "mutes",
  MUTES_KEY,
  {
    read: getMutes,
    write: replaceMutes,
    keyOf: (item) => `${item.kind}:${item.value}`,
    timestampOf: (item) => item.createdAt,
  },
  isMuteRecord
);

const blockedUsers = define<BlockedUser>(
  "blockedUsers",
  BLOCKED_USERS_KEY,
  {
    read: getBlockedUsers,
    write: replaceBlockedUsers,
    keyOf: (item) => item.username,
    timestampOf: (item) => item.blockedAt,
  },
  isBlockedUserRecord
);

// Hidden ids carry no timestamp: the engine stamps them when first seen.
const hidden = define<number>(
  "hidden",
  HIDDEN_STORIES_KEY,
  {
    read: getHiddenIds,
    write: replaceHiddenIds,
    keyOf: (id) => String(id),
  },
  (value): value is number => typeof value === "number"
);

const readStories = define<ReadStoryEntry>(
  "readStories",
  READ_STORIES_KEY,
  {
    read: getReadStories,
    write: replaceReadStories,
    keyOf: (item) => String(item.id),
    timestampOf: (item) => item.readAt,
    limit: SYNCED_READ_ENTRIES,
    capacity: MAX_READ_STORIES,
  },
  isReadStoryEntry
);

export const SYNCED_COLLECTIONS: readonly SyncedCollection[] = [
  bookmarks,
  mutes,
  blockedUsers,
  hidden,
  readStories,
];
