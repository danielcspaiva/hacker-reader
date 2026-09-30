import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  mergeDocuments,
  parseDocument,
  pruneTombstones,
  trimToBudget,
  byteLength,
  canonicalJson,
  serializeDocument,
  TOMBSTONE_TTL_MS,
  type SyncDocument,
} from "@/lib/sync/document";
import {
  syncCollection,
  type SyncCollection,
  type SyncContext,
} from "@/lib/sync/engine";

interface Bookmark {
  id: number;
  bookmarkedAt: number;
}

const isBookmark = (value: unknown): value is Bookmark =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "number" &&
  "bookmarkedAt" in value &&
  typeof value.bookmarkedAt === "number";

/** One fake iCloud shared by every device in a test. */
function createCloud() {
  const data = new Map<string, string>();
  return {
    data,
    getString: (key: string) => data.get(key) ?? null,
    setString: (key: string, value: string) => void data.set(key, value),
  };
}

/** A device: its own local list, AsyncStorage and clock, plus the shared cloud. */
function createDevice(
  cloud: ReturnType<typeof createCloud>,
  options: { limit?: number; capacity?: number; budgetBytes?: number } = {}
) {
  const clock = { now: 1_000 };
  let list: Bookmark[] = [];
  const storage = new Map<string, string>();
  let failRead = false;
  const collection: SyncCollection<Bookmark> = {
    name: "bookmarks",
    cloudKey: "sync.bookmarks",
    baseKey: "@sync_base_bookmarks",
    read: async () => {
      if (failRead) throw new Error("storage failed");
      return [...list];
    },
    write: async (items) => {
      list = [...items];
    },
    keyOf: (item) => String(item.id),
    timestampOf: (item) => item.bookmarkedAt,
    limit: options.limit,
    capacity: options.capacity,
  };
  const context: SyncContext = {
    cloud,
    storage: {
      getItem: async (key) => storage.get(key) ?? null,
      setItem: async (key, value) => void storage.set(key, value),
    },
    now: () => clock.now,
    budgetBytes: options.budgetBytes,
  };
  return {
    clock,
    ids: () => list.map((b) => b.id).sort((a, b) => a - b),
    list: () => list,
    setList: (next: Bookmark[]) => {
      list = next;
    },
    add(id: number) {
      list = [{ id, bookmarkedAt: clock.now }, ...list];
    },
    remove(id: number) {
      list = list.filter((b) => b.id !== id);
    },
    failReads: (fail: boolean) => {
      failRead = fail;
    },
    sync: () => syncCollection(collection, context, isBookmark),
  };
}

describe("syncCollection: propagation", () => {
  it("an add on A shows up on B", async () => {
    const cloud = createCloud();
    const a = createDevice(cloud);
    const b = createDevice(cloud);
    a.add(1);
    await a.sync();
    const result = await b.sync();
    assert.deepEqual(b.ids(), [1]);
    assert.equal(result.pulled, 1);
  });

  it("a delete on A removes the item on B", async () => {
    const cloud = createCloud();
    const a = createDevice(cloud);
    const b = createDevice(cloud);
    a.add(1);
    a.add(2);
    await a.sync();
    await b.sync();
    assert.deepEqual(b.ids(), [1, 2]);

    a.clock.now = 2_000;
    a.remove(1);
    await a.sync();
    b.clock.now = 3_000;
    const result = await b.sync();
    assert.deepEqual(b.ids(), [2]);
    assert.equal(result.removed, 1);
    // And it stays gone for A.
    await a.sync();
    assert.deepEqual(a.ids(), [2]);
  });

  it("does not write iCloud again when nothing changed", async () => {
    const cloud = createCloud();
    const a = createDevice(cloud);
    a.add(1);
    assert.equal((await a.sync()).wroteRemote, true);
    assert.equal((await a.sync()).wroteRemote, false);
    const b = createDevice(cloud);
    assert.equal((await b.sync()).wroteRemote, false);
  });

  it("merges two devices' independent adds", async () => {
    const cloud = createCloud();
    const a = createDevice(cloud);
    const b = createDevice(cloud);
    a.add(1);
    b.add(2);
    await a.sync();
    await b.sync();
    await a.sync();
    assert.deepEqual(a.ids(), [1, 2]);
    assert.deepEqual(b.ids(), [1, 2]);
  });
});

describe("syncCollection: conflicts", () => {
  it("resolves concurrent edits to the same item by last writer", async () => {
    const cloud = createCloud();
    const a = createDevice(cloud);
    const b = createDevice(cloud);
    a.setList([{ id: 1, bookmarkedAt: 100 }]);
    await a.sync();
    await b.sync();

    a.setList([{ id: 1, bookmarkedAt: 200 }]);
    b.setList([{ id: 1, bookmarkedAt: 300 }]);
    await a.sync();
    await b.sync();
    await a.sync();
    assert.deepEqual(a.list(), [{ id: 1, bookmarkedAt: 300 }]);
    assert.deepEqual(b.list(), [{ id: 1, bookmarkedAt: 300 }]);
  });

  it("a tombstone beats an older add", async () => {
    const cloud = createCloud();
    const a = createDevice(cloud);
    const b = createDevice(cloud);
    a.setList([{ id: 1, bookmarkedAt: 100 }]);
    await a.sync();
    await b.sync();

    // B deletes at t=5000; A (offline) still has the item from t=100.
    b.clock.now = 5_000;
    b.remove(1);
    await b.sync();
    a.clock.now = 6_000;
    await a.sync();
    assert.deepEqual(a.ids(), []);
  });

  it("an older tombstone loses to a newer add", async () => {
    const cloud = createCloud();
    const a = createDevice(cloud);
    const b = createDevice(cloud);
    a.setList([{ id: 1, bookmarkedAt: 100 }]);
    await a.sync();
    await b.sync();

    a.clock.now = 2_000;
    a.remove(1);
    await a.sync(); // tombstone at 2000
    // B re-adds later (bookmarkedAt 9000) without having seen the tombstone.
    b.clock.now = 9_000;
    b.setList([{ id: 1, bookmarkedAt: 9_000 }]);
    await b.sync();
    await a.sync();
    assert.deepEqual(a.ids(), [1]);
    assert.deepEqual(b.ids(), [1]);
  });

  it("tie-breaking is symmetric so devices converge", () => {
    const x: SyncDocument = {
      v: 1,
      items: { k: { value: { id: 1, n: "a" }, updatedAt: 5 } },
    };
    const y: SyncDocument = {
      v: 1,
      items: { k: { value: { id: 1, n: "b" }, updatedAt: 5 } },
    };
    assert.deepEqual(mergeDocuments(x, y), mergeDocuments(y, x));
    const t: SyncDocument = {
      v: 1,
      items: { k: { value: null, updatedAt: 5, deleted: true } },
    };
    assert.equal(mergeDocuments(x, t).items.k.deleted, true);
    assert.equal(mergeDocuments(t, x).items.k.deleted, true);
  });
});

describe("tombstones", () => {
  it("are pruned after 30 days", () => {
    const now = 100 * 24 * 60 * 60 * 1000;
    const doc: SyncDocument = {
      v: 1,
      items: {
        old: {
          value: null,
          updatedAt: now - TOMBSTONE_TTL_MS - 1,
          deleted: true,
        },
        fresh: { value: null, updatedAt: now - 1000, deleted: true },
        live: { value: { id: 1 }, updatedAt: 0 },
      },
    };
    assert.deepEqual(Object.keys(pruneTombstones(doc, now).items).sort(), [
      "fresh",
      "live",
    ]);
  });

  it("do not delete a local item added after a pruned tombstone", async () => {
    const cloud = createCloud();
    const a = createDevice(cloud);
    a.add(1);
    await a.sync();
    a.remove(1);
    a.clock.now = 2_000;
    await a.sync();
    a.clock.now = 2_000 + TOMBSTONE_TTL_MS + 1;
    a.add(1);
    await a.sync();
    assert.deepEqual(a.ids(), [1]);
  });
});

describe("size budget", () => {
  it("trims the oldest entries first to fit", () => {
    const items: SyncDocument["items"] = {};
    for (let i = 0; i < 200; i++) {
      items[String(i)] = { value: { id: i, bookmarkedAt: i }, updatedAt: i };
    }
    const doc: SyncDocument = { v: 1, items };
    const budget = 3_000;
    const { doc: trimmed, dropped } = trimToBudget(doc, budget);
    assert.ok(byteLength(serializeDocument(trimmed)) <= budget);
    assert.ok(dropped > 0);
    // The newest survive, the oldest go.
    assert.ok("199" in trimmed.items);
    assert.ok(!("0" in trimmed.items));
  });

  it("keeps everything when under budget", () => {
    const doc: SyncDocument = {
      v: 1,
      items: { a: { value: { id: 1 }, updatedAt: 1 } },
    };
    assert.deepEqual(trimToBudget(doc, 10_000), { doc, dropped: 0 });
  });

  it("pushes a trimmed copy but never drops local items", async () => {
    const cloud = createCloud();
    const a = createDevice(cloud, { budgetBytes: 1_500 });
    for (let i = 1; i <= 100; i++) {
      a.clock.now = i;
      a.add(i);
    }
    const result = await a.sync();
    assert.ok(result.trimmed > 0);
    assert.ok(byteLength(cloud.data.get("sync.bookmarks") ?? "") <= 1_500);
    assert.equal(a.ids().length, 100);
    // A second sync must not treat the trimmed-away items as remote deletions.
    await a.sync();
    assert.equal(a.ids().length, 100);
  });

  it("only pushes the most recent `limit` items", async () => {
    const cloud = createCloud();
    const a = createDevice(cloud, { limit: 5 });
    for (let i = 1; i <= 20; i++) {
      a.clock.now = i;
      a.add(i);
    }
    const result = await a.sync();
    assert.equal(result.pushed, 5);
    const b = createDevice(cloud);
    await b.sync();
    assert.deepEqual(b.ids(), [16, 17, 18, 19, 20]);
    assert.equal(a.ids().length, 20);
  });

  it("does not turn items evicted by the store's own cap into deletions", async () => {
    const cloud = createCloud();
    const a = createDevice(cloud, { capacity: 3 });
    const b = createDevice(cloud);
    a.setList([
      { id: 1, bookmarkedAt: 1 },
      { id: 2, bookmarkedAt: 2 },
      { id: 3, bookmarkedAt: 3 },
    ]);
    await a.sync();
    await b.sync();
    // The store drops the oldest when a fourth arrives.
    a.clock.now = 4;
    a.setList([
      { id: 4, bookmarkedAt: 4 },
      { id: 3, bookmarkedAt: 3 },
      { id: 2, bookmarkedAt: 2 },
    ]);
    await a.sync();
    await b.sync();
    assert.deepEqual(b.ids(), [1, 2, 3, 4]);
  });
});

describe("remote problems", () => {
  it("ignores corrupt remote JSON, reports it, keeps local data and repairs the key", async () => {
    const cloud = createCloud();
    const a = createDevice(cloud);
    a.add(1);
    a.add(2);
    cloud.data.set("sync.bookmarks", "{not json");
    const result = await a.sync();
    assert.equal(result.remoteProblem, "corrupt");
    assert.deepEqual(a.ids(), [1, 2]);
    assert.equal(parseDocument(cloud.data.get("sync.bookmarks")).status, "ok");
  });

  it("ignores a wrongly shaped document", async () => {
    const cloud = createCloud();
    const a = createDevice(cloud);
    a.add(1);
    cloud.data.set("sync.bookmarks", JSON.stringify({ hello: "world" }));
    const result = await a.sync();
    assert.equal(result.remoteProblem, "corrupt");
    assert.deepEqual(a.ids(), [1]);
  });

  it("does not wipe local data when a remote document is empty or all tombstones for other items", async () => {
    const cloud = createCloud();
    const a = createDevice(cloud);
    a.add(1);
    cloud.data.set("sync.bookmarks", JSON.stringify({ v: 1, items: {} }));
    await a.sync();
    assert.deepEqual(a.ids(), [1]);
  });

  it("drops malformed entries but keeps the valid ones", async () => {
    const cloud = createCloud();
    cloud.data.set(
      "sync.bookmarks",
      JSON.stringify({
        v: 1,
        items: {
          "1": { value: { id: 1, bookmarkedAt: 5 }, updatedAt: 5 },
          "2": { value: "nonsense", updatedAt: 5 },
          "3": { updatedAt: "x" },
        },
      })
    );
    const a = createDevice(cloud);
    await a.sync();
    assert.deepEqual(a.ids(), [1]);
  });

  it("leaves a document from a newer app version untouched", async () => {
    const cloud = createCloud();
    const future = JSON.stringify({ v: 2, items: {}, extra: true });
    cloud.data.set("sync.bookmarks", future);
    const a = createDevice(cloud);
    a.add(1);
    const result = await a.sync();
    assert.equal(result.remoteProblem, "unsupported");
    assert.equal(cloud.data.get("sync.bookmarks"), future);
    assert.deepEqual(a.ids(), [1]);
  });

  it("aborts without writing anything when the local read fails", async () => {
    const cloud = createCloud();
    const a = createDevice(cloud);
    a.add(1);
    await a.sync();
    const before = cloud.data.get("sync.bookmarks");
    a.failReads(true);
    await assert.rejects(a.sync(), /storage failed/);
    // A failed read must not look like "everything was deleted".
    assert.equal(cloud.data.get("sync.bookmarks"), before);
  });
});

describe("parseDocument", () => {
  it("treats null and empty as missing", () => {
    assert.deepEqual(parseDocument(null), { status: "missing" });
    assert.deepEqual(parseDocument(""), { status: "missing" });
  });
});

describe("canonicalJson", () => {
  it("ignores key order at every level", () => {
    assert.equal(
      canonicalJson({ a: 1, b: { c: 2, d: [{ y: 1, x: 2 }] } }),
      canonicalJson({ b: { d: [{ x: 2, y: 1 }], c: 2 }, a: 1 })
    );
  });
});
