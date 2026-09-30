/**
 * The sync algorithm for one collection (bookmarks, mutes, ...). Pure: storage,
 * iCloud and the clock are injected, so it is tested in node.
 *
 * Inputs: the local list (through the collection's store), the remote document
 * (iCloud key-value store) and the BASE, a local document kept in AsyncStorage
 * holding the merged state after the last sync.
 *
 * The local stores do not record deletions, so the base is how we notice them:
 *
 *  1. LOCAL DOC. Start from the base. An item in the local list that is new,
 *     changed, or was a tombstone becomes a live entry stamped with its own
 *     timestamp (`timestampOf`, or now). An item live in the base but missing
 *     from the local list becomes a tombstone stamped now, unless the store
 *     evicted it for capacity (see `capacity`), which is not a deletion.
 *  2. REMOTE DOC. Parse what iCloud holds. Missing is empty. Corrupt JSON is
 *     ignored and reported (and later overwritten by a valid document). A
 *     document from a newer app version is left alone entirely.
 *  3. MERGE. Per key, last writer wins (`pickWinner`); a tombstone beats an
 *     older add, an older tombstone loses to a newer add. Tombstones older
 *     than 30 days are pruned.
 *  4. APPLY. Patch the local list: drop keys whose winner is a tombstone,
 *     insert/replace keys whose winner is live. Items the merge does not
 *     mention are left alone, so local data is never wiped by a sync; a failed
 *     local read aborts before anything is written.
 *  5. PUSH. The pushed copy is capped to the `limit` most recent live items,
 *     then trimmed oldest-first to the byte budget, and written only when it
 *     differs from what iCloud already holds. The base keeps the untrimmed
 *     merge.
 */

import {
  countLive,
  documentsEqual,
  emptyDocument,
  limitLiveEntries,
  mergeDocuments,
  parseDocument,
  pruneTombstones,
  serializeDocument,
  trimToBudget,
  canonicalJson,
  type SyncDocument,
  type SyncEntry,
} from "./document";

/** Per-document byte budget: 5 documents stay far below iCloud's 1 MB total. */
export const DEFAULT_DOCUMENT_BUDGET_BYTES = 150 * 1024;

export interface SyncCollection<T> {
  /** Stable name, for reports. */
  name: string;
  /** The iCloud key-value key holding this collection's document. */
  cloudKey: string;
  /** The AsyncStorage key holding the base document. */
  baseKey: string;
  read(): Promise<T[]>;
  /** Replaces the stored list (the store sorts and caps it). */
  write(items: T[]): Promise<void>;
  keyOf(item: T): string;
  /** Unix ms the item was created/changed, when the record carries one. */
  timestampOf?(item: T): number | undefined;
  /** Only the N most recent items are pushed to iCloud. */
  limit?: number;
  /** The local store's own cap; an item it evicts is not a deletion. */
  capacity?: number;
}

export interface SyncKeyValueStore {
  getString(key: string): string | null;
  setString(key: string, value: string): void;
}

export interface SyncStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface SyncContext {
  cloud: SyncKeyValueStore;
  storage: SyncStorage;
  now: () => number;
  budgetBytes?: number;
}

export type RemoteProblem = "corrupt" | "unsupported";

export interface CollectionSyncResult {
  name: string;
  /** Items added or replaced locally from iCloud. */
  pulled: number;
  /** Items removed locally because another device deleted them. */
  removed: number;
  /** Live items in the copy now in iCloud. */
  pushed: number;
  /** Entries left out of the pushed copy to fit the budget. */
  trimmed: number;
  wroteRemote: boolean;
  remoteProblem?: RemoteProblem;
  remoteProblemDetail?: string;
}

async function readBase(
  storage: SyncStorage,
  key: string
): Promise<SyncDocument> {
  const json = await storage.getItem(key);
  const parsed = parseDocument(json);
  // A bad base only costs deletion detection for one round; never throw for it.
  return parsed.status === "ok" ? parsed.doc : emptyDocument();
}

/** Step 1: fold the local list (and its deletions) into the base. */
export function buildLocalDocument<T>(
  collection: SyncCollection<T>,
  local: T[],
  base: SyncDocument,
  now: number
): SyncDocument {
  const items: Record<string, SyncEntry> = { ...base.items };
  const present = new Set<string>();
  let oldestLocal = Number.POSITIVE_INFINITY;

  for (const item of local) {
    const key = collection.keyOf(item);
    present.add(key);
    const ts = collection.timestampOf?.(item);
    if (ts !== undefined) oldestLocal = Math.min(oldestLocal, ts);
    const known = base.items[key];
    if (
      known &&
      !known.deleted &&
      canonicalJson(known.value) === canonicalJson(item)
    ) {
      continue; // unchanged since the last sync
    }
    // Changed or new (or re-added after a delete): its own time, else now. A
    // change never goes back in time relative to what the base knew.
    const stamped = ts ?? now;
    items[key] = {
      value: item,
      updatedAt: known ? Math.max(stamped, known.updatedAt) : stamped,
    };
  }

  const atCapacity =
    collection.capacity !== undefined && local.length >= collection.capacity;
  for (const [key, entry] of Object.entries(base.items)) {
    if (entry.deleted || present.has(key)) continue;
    if (atCapacity && entry.updatedAt <= oldestLocal) {
      delete items[key]; // evicted by the store's cap, not deleted by the user
      continue;
    }
    items[key] = { value: null, updatedAt: now, deleted: true };
  }
  return { v: 1, items };
}

export interface AppliedChanges<T> {
  items: T[];
  pulled: number;
  removed: number;
}

/** Step 4: patch the local list with the merge result. */
export function applyMerged<T>(
  collection: SyncCollection<T>,
  local: T[],
  merged: SyncDocument
): AppliedChanges<T> {
  let pulled = 0;
  let removed = 0;
  const seen = new Set<string>();
  const items: T[] = [];
  for (const item of local) {
    const key = collection.keyOf(item);
    seen.add(key);
    const entry = merged.items[key];
    if (!entry) {
      items.push(item);
    } else if (entry.deleted) {
      removed += 1;
    } else if (canonicalJson(entry.value) === canonicalJson(item)) {
      items.push(item);
    } else {
      // SAFETY: live remote entries passed the collection's guard in `syncCollection`;
      // live local entries come from its own records.
      items.push(entry.value as T);
      pulled += 1;
    }
  }
  for (const [key, entry] of Object.entries(merged.items)) {
    if (!seen.has(key) && !entry.deleted) {
      // SAFETY: as above, live entries are validated records.
      items.push(entry.value as T);
      pulled += 1;
    }
  }
  return { items, pulled, removed };
}

export async function syncCollection<T>(
  collection: SyncCollection<T>,
  context: SyncContext,
  isValid: (value: unknown) => value is T
): Promise<CollectionSyncResult> {
  const now = context.now();
  const budget = context.budgetBytes ?? DEFAULT_DOCUMENT_BUDGET_BYTES;

  // A failed read throws here, before anything is written anywhere.
  const local = await collection.read();
  const base = await readBase(context.storage, collection.baseKey);
  const localDoc = buildLocalDocument(collection, local, base, now);

  const remote = parseDocument(context.cloud.getString(collection.cloudKey));
  const result: CollectionSyncResult = {
    name: collection.name,
    pulled: 0,
    removed: 0,
    pushed: 0,
    trimmed: 0,
    wroteRemote: false,
  };

  if (remote.status === "unsupported") {
    // Newer app version wrote it: keep our base, touch nothing remote.
    result.remoteProblem = "unsupported";
    result.remoteProblemDetail = `document version ${remote.version}`;
    await context.storage.setItem(
      collection.baseKey,
      serializeDocument(localDoc)
    );
    return result;
  }
  if (remote.status === "corrupt") {
    result.remoteProblem = "corrupt";
    result.remoteProblemDetail = remote.reason;
  }
  const remoteDoc = remote.status === "ok" ? remote.doc : emptyDocument();

  // Entries from iCloud whose value is not a valid record never reach a store.
  const validRemote: SyncDocument = {
    v: 1,
    items: Object.fromEntries(
      Object.entries(remoteDoc.items).filter(
        ([, entry]) => entry.deleted || isValid(entry.value)
      )
    ),
  };

  const merged = pruneTombstones(mergeDocuments(localDoc, validRemote), now);

  const applied = applyMerged(collection, local, merged);
  if (applied.pulled > 0 || applied.removed > 0) {
    await collection.write(applied.items);
  }
  result.pulled = applied.pulled;
  result.removed = applied.removed;

  // The base is saved after the local write, so a failed write retries next time.
  await context.storage.setItem(collection.baseKey, serializeDocument(merged));

  const limited =
    collection.limit === undefined
      ? merged
      : limitLiveEntries(merged, collection.limit);
  const { doc: pushDoc, dropped } = trimToBudget(limited, budget);
  result.trimmed = dropped + (countLive(merged) - countLive(limited));
  result.pushed = countLive(pushDoc);

  const nothingToPublish =
    remote.status === "missing" && Object.keys(pushDoc.items).length === 0;
  if (
    !nothingToPublish &&
    (remote.status !== "ok" || !documentsEqual(pushDoc, remoteDoc))
  ) {
    context.cloud.setString(collection.cloudKey, serializeDocument(pushDoc));
    result.wroteRemote = true;
  }
  return result;
}
