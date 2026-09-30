import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createJsonListStore,
  type KeyValueStorage,
} from "@/lib/hn/local/json-list-store";

function fakeStorage(initial?: string) {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set("k", initial);
  const state = { failReads: false, failWrites: false };
  const storage: KeyValueStorage = {
    async getItem(key) {
      if (state.failReads) throw new Error("read failed");
      return data.get(key) ?? null;
    },
    async setItem(key, value) {
      if (state.failWrites) throw new Error("write failed");
      data.set(key, value);
    },
    async removeItem(key) {
      data.delete(key);
    },
  };
  return { storage, data, state };
}

const isNumber = (value: unknown): value is number => typeof value === "number";

describe("createJsonListStore", () => {
  it("reads an empty list when nothing is stored", async () => {
    const { storage } = fakeStorage();
    const store = createJsonListStore({ key: "k", guard: isNumber, storage });
    assert.deepEqual(await store.read(), []);
  });

  it("drops entries the guard rejects and non-array payloads", async () => {
    const a = fakeStorage(JSON.stringify([1, "x", 2, null]));
    assert.deepEqual(
      await createJsonListStore({
        key: "k",
        guard: isNumber,
        storage: a.storage,
      }).read(),
      [1, 2]
    );
    const b = fakeStorage(JSON.stringify({ not: "a list" }));
    assert.deepEqual(
      await createJsonListStore({
        key: "k",
        guard: isNumber,
        storage: b.storage,
      }).read(),
      []
    );
  });

  it("update writes the changed list and returns it", async () => {
    const { storage, data } = fakeStorage(JSON.stringify([1]));
    const store = createJsonListStore({ key: "k", guard: isNumber, storage });
    assert.deepEqual(await store.update((ids) => [...ids, 2]), [1, 2]);
    assert.equal(data.get("k"), "[1,2]");
  });

  it("DATA LOSS FIX: a failed read makes update throw and leaves the stored list untouched", async () => {
    const { storage, data, state } = fakeStorage(JSON.stringify([1, 2, 3]));
    const store = createJsonListStore({ key: "k", guard: isNumber, storage });
    state.failReads = true;
    await assert.rejects(
      store.update((ids) => [...ids, 4]),
      /read failed/
    );
    assert.equal(data.get("k"), "[1,2,3]");
  });

  it("DATA LOSS FIX: corrupt JSON makes update throw instead of overwriting with []", async () => {
    const { storage, data } = fakeStorage("{not json");
    const store = createJsonListStore({ key: "k", guard: isNumber, storage });
    await assert.rejects(store.read());
    await assert.rejects(store.update(() => [9]));
    assert.equal(data.get("k"), "{not json");
  });

  it("a failed update does not block the next one", async () => {
    const { storage, state } = fakeStorage(JSON.stringify([1]));
    const store = createJsonListStore({ key: "k", guard: isNumber, storage });
    state.failWrites = true;
    await assert.rejects(store.update((ids) => [...ids, 2]));
    state.failWrites = false;
    assert.deepEqual(await store.update((ids) => [...ids, 3]), [1, 3]);
  });

  it("concurrent updates are serialized: none is lost", async () => {
    const { storage } = fakeStorage(JSON.stringify([]));
    const store = createJsonListStore({ key: "k", guard: isNumber, storage });
    await Promise.all(
      [1, 2, 3, 4, 5].map((n) => store.update((ids) => [...ids, n]))
    );
    assert.deepEqual(await store.read(), [1, 2, 3, 4, 5]);
  });

  it("clear removes the key", async () => {
    const { storage, data } = fakeStorage(JSON.stringify([1]));
    const store = createJsonListStore({ key: "k", guard: isNumber, storage });
    await store.clear();
    assert.equal(data.has("k"), false);
  });
});
