import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { upsertDevice, getDevice } from "../lib/devices";
import {
  checkPendingReceipts,
  chunk,
  sendPush,
  type PushMessage,
} from "../lib/push";
import { fakeFetch } from "./helpers";
import { MemoryStore } from "./memory-store";

const ID = "3f2b8f3e-6f6e-4a52-9a7e-0f1e1c2d3a4b";
const token = (n: number) =>
  `ExponentPushToken[token${String(n).padStart(8, "0")}]`;

describe("chunk", () => {
  it("splits into batches", () => {
    assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
    assert.deepEqual(chunk([], 2), []);
  });
});

describe("sendPush", () => {
  it("batches 250 messages into 100, 100 and 50 with the access token", async () => {
    const sizes: number[] = [];
    const auths: (string | null)[] = [];
    let ticket = 0;
    const fetchImpl = fakeFetch((_url, init) => {
      const batch: PushMessage[] = JSON.parse(String(init?.body));
      sizes.push(batch.length);
      auths.push(new Headers(init?.headers).get("authorization"));
      return Response.json({
        data: batch.map(() => ({ status: "ok", id: `t${ticket++}` })),
      });
    });

    const messages = Array.from({ length: 250 }, (_, i) => ({
      to: token(i),
      body: "hi",
    }));
    const store = new MemoryStore();
    const result = await sendPush(messages, {
      store,
      fetch: fetchImpl,
      accessToken: "expo-secret",
    });

    assert.deepEqual(sizes, [100, 100, 50]);
    assert.deepEqual(auths, Array(3).fill("Bearer expo-secret"));
    assert.deepEqual(result, { sent: 250, failed: 0, removedTokens: 0 });
    assert.equal((await store.smembers("push:tickets")).length, 250);
  });

  it("removes a token on an immediate DeviceNotRegistered", async () => {
    const store = new MemoryStore();
    const dead = token(1);
    await upsertDevice(store, ID, {
      platform: "ios",
      appVersion: "1.0.0",
      timezone: "UTC",
      expoPushToken: dead,
    });
    const fetchImpl = fakeFetch(() =>
      Response.json({
        data: [
          {
            status: "error",
            message: "gone",
            details: { error: "DeviceNotRegistered" },
          },
        ],
      })
    );

    const result = await sendPush([{ to: dead, body: "x" }], {
      store,
      fetch: fetchImpl,
    });
    assert.deepEqual(result, { sent: 0, failed: 1, removedTokens: 1 });
    assert.equal((await getDevice(store, ID))?.expoPushToken, undefined);
  });

  it("counts a failed request without throwing", async () => {
    const fetchImpl = fakeFetch(() => new Response("no", { status: 500 }));
    const result = await sendPush([{ to: token(1) }], {
      store: new MemoryStore(),
      fetch: fetchImpl,
    });
    assert.equal(result.failed, 1);
  });
});

describe("checkPendingReceipts", () => {
  it("removes tokens reported as DeviceNotRegistered and clears checked tickets", async () => {
    const store = new MemoryStore();
    const dead = token(1);
    await upsertDevice(store, ID, {
      platform: "ios",
      appVersion: "1.0.0",
      timezone: "UTC",
      expoPushToken: dead,
    });
    const sendFetch = fakeFetch(() =>
      Response.json({
        data: [
          { status: "ok", id: "ticket-dead" },
          { status: "ok", id: "ticket-waiting" },
        ],
      })
    );
    await sendPush([{ to: dead }, { to: token(2) }], {
      store,
      fetch: sendFetch,
    });

    const receiptFetch = fakeFetch(() =>
      Response.json({
        data: {
          "ticket-dead": {
            status: "error",
            details: { error: "DeviceNotRegistered" },
          },
        },
      })
    );
    const result = await checkPendingReceipts({ store, fetch: receiptFetch });

    assert.deepEqual(result, { checked: 1, removedTokens: 1 });
    assert.equal((await getDevice(store, ID))?.expoPushToken, undefined);
    assert.deepEqual(await store.smembers("push:tickets"), ["ticket-waiting"]);
  });
});
