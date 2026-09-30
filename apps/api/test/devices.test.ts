import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  deleteDeviceData,
  getDevice,
  parseDeviceInput,
  removePushToken,
  upsertDevice,
} from "../lib/devices";
import type { JsonObject } from "../lib/json";
import { MemoryStore } from "./memory-store";

const ID = "3f2b8f3e-6f6e-4a52-9a7e-0f1e1c2d3a4b";
const OTHER = "7a1c9d2e-1b3f-4c5d-8e6f-0a1b2c3d4e5f";
const TOKEN = "ExponentPushToken[abcdefghijklmnop]";

const valid = {
  platform: "ios",
  appVersion: "1.5.0",
  timezone: "Europe/Lisbon",
};

describe("parseDeviceInput", () => {
  it("accepts a minimal body", () => {
    const result = parseDeviceInput(valid);
    assert.equal(result.ok, true);
  });

  it("accepts push token, username and prefs", () => {
    const result = parseDeviceInput({
      ...valid,
      expoPushToken: TOKEN,
      hnUsername: "pg",
      prefs: { replies: true, keywords: ["rust", "zig"], hour: 8 },
    });
    assert.equal(result.ok, true);
  });

  it("rejects non-objects", () => {
    assert.equal(parseDeviceInput(null).ok, false);
    assert.equal(parseDeviceInput([]).ok, false);
    assert.equal(parseDeviceInput("x").ok, false);
  });

  it("reports every invalid field", () => {
    const result = parseDeviceInput({
      platform: "web",
      appVersion: "not a version!",
      timezone: "Mars/Olympus",
      expoPushToken: "nope",
      hnUsername: "a",
      prefs: { nested: { a: 1 } },
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.errors.length, 6);
  });

  it("limits prefs size", () => {
    const prefs = Object.fromEntries(
      Array.from({ length: 21 }, (_, i) => [`k${i}`, true])
    );
    assert.equal(parseDeviceInput({ ...valid, prefs }).ok, false);
  });

  it("keeps null (clear) distinct from undefined (keep)", () => {
    const result = parseDeviceInput({ ...valid, hnUsername: null });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.hnUsername, null);
      assert.equal("expoPushToken" in result.value, false);
    }
  });
});

describe("device storage", () => {
  const input = (overrides: JsonObject = {}) => {
    const parsed = parseDeviceInput({ ...valid, ...overrides });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) throw new Error("invalid");
    return parsed.value;
  };

  it("upserts, keeping optional fields until cleared", async () => {
    const store = new MemoryStore();
    const first = await upsertDevice(
      store,
      ID,
      input({ expoPushToken: TOKEN, hnUsername: "pg" }),
      new Date("2026-01-01T00:00:00Z")
    );
    assert.equal(first.createdAt, "2026-01-01T00:00:00.000Z");

    const second = await upsertDevice(
      store,
      ID,
      input({ appVersion: "1.6.0" }),
      new Date("2026-01-02T00:00:00Z")
    );
    assert.equal(second.appVersion, "1.6.0");
    assert.equal(second.expoPushToken, TOKEN);
    assert.equal(second.hnUsername, "pg");
    assert.equal(second.createdAt, first.createdAt);

    const cleared = await upsertDevice(store, ID, input({ hnUsername: null }));
    assert.equal(cleared.hnUsername, undefined);
    assert.equal(cleared.expoPushToken, TOKEN);
    assert.deepEqual(await store.smembers("devices"), [ID]);
  });

  it("moves a push token to the newest install", async () => {
    const store = new MemoryStore();
    await upsertDevice(store, ID, input({ expoPushToken: TOKEN }));
    await upsertDevice(store, OTHER, input({ expoPushToken: TOKEN }));
    assert.equal((await getDevice(store, ID))?.expoPushToken, undefined);
    assert.equal((await getDevice(store, OTHER))?.expoPushToken, TOKEN);
  });

  it("deletes everything for an install", async () => {
    const store = new MemoryStore();
    await upsertDevice(store, ID, input({ expoPushToken: TOKEN }));
    await store.set(`entitlement:${ID}`, { pro: true });
    await deleteDeviceData(store, ID);
    assert.equal(await getDevice(store, ID), null);
    assert.equal(await store.get(`entitlement:${ID}`), null);
    assert.equal(await store.get(`pushtoken:${TOKEN}`), null);
    assert.deepEqual(await store.smembers("devices"), []);
  });

  it("removes a dead push token from its device", async () => {
    const store = new MemoryStore();
    await upsertDevice(store, ID, input({ expoPushToken: TOKEN }));
    await removePushToken(store, TOKEN);
    assert.equal((await getDevice(store, ID))?.expoPushToken, undefined);
  });
});
