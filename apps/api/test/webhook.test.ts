import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getObject, type JsonObject, type JsonValue } from "../lib/json";
import { eventInstallIds, handleRevenueCatWebhook } from "../lib/webhook";
import { fakeFetch, readFixture } from "./helpers";
import { MemoryStore } from "./memory-store";

const ID = "3f2b8f3e-6f6e-4a52-9a7e-0f1e1c2d3a4b";
const ALIAS = "7a1c9d2e-1b3f-4c5d-8e6f-0a1b2c3d4e5f";
const fixture = readFixture("subscriber-pro.json");

function setup(subscriber: JsonValue = fixture, status = 200) {
  const store = new MemoryStore();
  const fetched: string[] = [];
  const fetchImpl = fakeFetch((url) => {
    fetched.push(url);
    return Response.json(subscriber, { status });
  });
  const deps = {
    store,
    fetch: fetchImpl,
    now: () => Date.parse("2026-09-30T12:00:00Z"),
    secretKey: "sk",
    authSecret: "Bearer hook-secret",
  };
  return { store, fetched, deps };
}

function webhook(
  event: JsonObject,
  auth: string | null = "Bearer hook-secret"
) {
  return new Request("https://x.test/api/v1/webhooks/revenuecat", {
    method: "POST",
    headers: auth ? { Authorization: auth } : {},
    body: JSON.stringify({ event }),
  });
}

describe("eventInstallIds", () => {
  it("collects user id, original id and aliases, skipping anonymous ids", () => {
    assert.deepEqual(
      eventInstallIds({
        app_user_id: ID,
        original_app_user_id: "$RCAnonymousID:abc",
        aliases: [ID, ALIAS, "$RCAnonymousID:def"],
      }),
      [ID, ALIAS]
    );
  });
});

describe("TRANSFER events", () => {
  const transfer = readFixture("webhook-transfer.json");

  it("collects ids from transferred_from and transferred_to", () => {
    const event = getObject(transfer, "event");
    assert.ok(event);
    assert.deepEqual(eventInstallIds(event), [ID, ALIAS]);
  });

  it("refreshes every install involved in a transfer", async () => {
    const { deps, store, fetched } = setup();
    const response = await handleRevenueCatWebhook(
      new Request("https://x.test", {
        method: "POST",
        headers: { Authorization: "Bearer hook-secret" },
        body: JSON.stringify(transfer),
      }),
      deps
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, refreshed: 2 });
    assert.equal(fetched.length, 2);
    assert.notEqual(await store.get(`entitlement:${ID}`), null);
    assert.notEqual(await store.get(`entitlement:${ALIAS}`), null);
  });
});

describe("handleRevenueCatWebhook", () => {
  it("rejects a wrong or missing Authorization header", async () => {
    const { deps, fetched } = setup();
    const event = { type: "RENEWAL", app_user_id: ID };
    assert.equal(
      (await handleRevenueCatWebhook(webhook(event, "Bearer nope"), deps))
        .status,
      401
    );
    assert.equal(
      (await handleRevenueCatWebhook(webhook(event, null), deps)).status,
      401
    );
    assert.equal(fetched.length, 0);
  });

  it("fails closed when no secret is configured", async () => {
    const { deps } = setup();
    const response = await handleRevenueCatWebhook(
      webhook({ type: "RENEWAL" }, ""),
      {
        ...deps,
        authSecret: "",
      }
    );
    assert.equal(response.status, 401);
  });

  it("refreshes the cached entitlement for the user and aliases", async () => {
    const { deps, store, fetched } = setup();
    const response = await handleRevenueCatWebhook(
      webhook({
        type: "INITIAL_PURCHASE",
        app_user_id: ID,
        aliases: [ID, ALIAS],
      }),
      deps
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, refreshed: 2 });
    assert.equal(fetched.length, 2);
    assert.deepEqual(await store.get(`entitlement:${ID}`), {
      pro: true,
      expiresAt: "2026-10-15T09:00:00.000Z",
    });
    assert.notEqual(await store.get(`entitlement:${ALIAS}`), null);
  });

  it("overwrites a stale cache on EXPIRATION", async () => {
    const { deps, store } = setup({ subscriber: { entitlements: {} } });
    await store.set(`entitlement:${ID}`, { pro: true });
    await handleRevenueCatWebhook(
      webhook({ type: "EXPIRATION", app_user_id: ID }),
      deps
    );
    assert.deepEqual(await store.get(`entitlement:${ID}`), { pro: false });
  });

  it("handles every refresh event type", async () => {
    for (const type of [
      "INITIAL_PURCHASE",
      "RENEWAL",
      "CANCELLATION",
      "EXPIRATION",
      "UNCANCELLATION",
      "PRODUCT_CHANGE",
      "BILLING_ISSUE",
      "TRANSFER",
      "SUBSCRIPTION_PAUSED",
      "SUBSCRIPTION_EXTENDED",
      "TEMPORARY_ENTITLEMENT_GRANT",
      "NON_RENEWING_PURCHASE",
      "REFUND_REVERSED",
    ]) {
      const { deps, fetched } = setup();
      const response = await handleRevenueCatWebhook(
        webhook({ type, app_user_id: ID }),
        deps
      );
      assert.equal(response.status, 200, type);
      assert.equal(fetched.length, 1, type);
    }
  });

  it("ignores other event types with 200", async () => {
    const { deps, fetched } = setup();
    const response = await handleRevenueCatWebhook(
      webhook({ type: "TEST", app_user_id: ID }),
      deps
    );
    assert.equal(response.status, 200);
    assert.equal(fetched.length, 0);
  });

  it("answers 400 without an event and 500 when the refresh fails", async () => {
    const { deps } = setup({}, 500);
    const empty = new Request("https://x.test", {
      method: "POST",
      headers: { Authorization: "Bearer hook-secret" },
      body: "{}",
    });
    assert.equal((await handleRevenueCatWebhook(empty, deps)).status, 400);
    const failed = await handleRevenueCatWebhook(
      webhook({ type: "RENEWAL", app_user_id: ID }),
      deps
    );
    assert.equal(failed.status, 500);
  });
});
