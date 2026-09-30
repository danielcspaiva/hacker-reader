import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { upsertDevice, type DeviceInput } from "../lib/devices";
import {
  buildDigestMessage,
  digestBody,
  handleDigestSendCron,
  pickDigest,
  runDigestSend,
} from "../lib/digest/send";
import {
  digestKey,
  digestSentKey,
  type Digest,
  type DigestStory,
} from "../lib/digest/store";
import type { JsonObject } from "../lib/json";
import { fakeFetch } from "./helpers";
import { MemoryStore } from "./memory-store";

// 06:00 UTC on 2026-09-30.
const NOW = Date.parse("2026-09-30T06:00:00Z");

const story = (id: number): DigestStory => ({
  id,
  title: `Story ${id}`,
  url: `https://s${id}.example`,
  domain: `s${id}.example`,
  points: 100 - id,
  comments: id,
  blurb: `Blurb ${id}`,
});

const digestFor = (date: string, count = 5): Digest => ({
  date,
  stories: Array.from({ length: count }, (_, i) => story(i + 1)),
  generatedAt: `${date}T05:00:00.000Z`,
});

let counter = 0;
const token = () =>
  `ExponentPushToken[tok${String(++counter).padStart(12, "0")}]`;

async function addDevice(
  store: MemoryStore,
  installId: string,
  options: {
    timezone?: string;
    hour?: number;
    enabled?: boolean;
    pro?: boolean;
    token?: string | null;
  } = {}
) {
  const input: DeviceInput = {
    platform: "ios",
    appVersion: "1.0.0",
    timezone: options.timezone ?? "UTC",
    prefs: {
      digest: { enabled: options.enabled ?? true, hour: options.hour ?? 6 },
    },
  };
  if (options.token !== null) input.expoPushToken = options.token ?? token();
  await upsertDevice(store, installId, input);
  await store.set(`entitlement:${installId}`, { pro: options.pro ?? true });
}

function setup(nowMs = NOW) {
  const store = new MemoryStore();
  const clock = { now: nowMs };
  const sent: JsonObject[] = [];
  const fetchImpl = fakeFetch((url, init) => {
    if (url.includes("getReceipts")) return Response.json({ data: {} });
    const batch: JsonObject[] = JSON.parse(String(init?.body));
    sent.push(...batch);
    return Response.json({
      data: batch.map((_, i) => ({ status: "ok", id: `t${sent.length}-${i}` })),
    });
  });
  const deps = {
    store,
    fetch: fetchImpl,
    now: () => clock.now,
    secretKey: "sk",
  };
  return { store, clock, sent, deps };
}

describe("digest message", () => {
  it("uses the top story and the number of others", () => {
    assert.equal(digestBody(digestFor("2026-09-30", 5)), "Story 1 and 4 more");
    assert.equal(digestBody(digestFor("2026-09-30", 1)), "Story 1");
    const long = digestFor("2026-09-30", 2);
    long.stories[0]!.title = "x".repeat(300);
    assert.ok(digestBody(long).length < 130);
  });

  it("links to the digest of its date", () => {
    const message = buildDigestMessage("tok", digestFor("2026-09-30"));
    assert.equal(message.title, "☕ Your HN morning");
    assert.deepEqual(message.data, {
      url: "hnclient://digest/2026-09-30",
      kind: "digest",
    });
  });
});

describe("pickDigest", () => {
  it("prefers today, falls back to yesterday, else null", async () => {
    const store = new MemoryStore();
    assert.equal(await pickDigest(store, NOW), null);
    await store.set(digestKey("2026-09-29"), digestFor("2026-09-29"));
    assert.equal((await pickDigest(store, NOW))?.date, "2026-09-29");
    await store.set(digestKey("2026-09-30"), digestFor("2026-09-30"));
    assert.equal((await pickDigest(store, NOW))?.date, "2026-09-30");
    // Two days old is too old.
    const old = new MemoryStore();
    await old.set(digestKey("2026-09-28"), digestFor("2026-09-28"));
    assert.equal(await pickDigest(old, NOW), null);
  });
});

describe("runDigestSend", () => {
  it("sends once to a Pro device in its window and marks it", async () => {
    const { store, sent, deps } = setup();
    await store.set(digestKey("2026-09-30"), digestFor("2026-09-30"));
    await addDevice(store, "a", { hour: 6 });

    const summary = await runDigestSend(deps);
    assert.equal(summary.sent, 1);
    assert.equal(summary.digestDate, "2026-09-30");
    assert.equal(sent.length, 1);
    assert.equal(sent[0]?.title, "☕ Your HN morning");
    assert.equal(sent[0]?.body, "Story 1 and 4 more");
    assert.equal(
      store.ttls.get(digestSentKey("a", "2026-09-30")),
      2 * 24 * 60 * 60
    );

    // The next tick inside the same window does not send again.
    const again = await runDigestSend(deps);
    assert.equal(again.sent, 0);
    assert.equal(sent.length, 1);
  });

  it("respects each device's timezone and hour", async () => {
    // 02:30 UTC = 08:00 in Kolkata, 11:30 in Tokyo, 02:30 in UTC.
    const { store, sent, deps } = setup(Date.parse("2026-09-30T02:30:00Z"));
    await store.set(digestKey("2026-09-30"), digestFor("2026-09-30"));
    await addDevice(store, "kolkata", { timezone: "Asia/Kolkata", hour: 8 });
    await addDevice(store, "utc-2", { timezone: "UTC", hour: 2 }); // past :15
    await addDevice(store, "wrong-hour", { timezone: "Asia/Kolkata", hour: 9 });
    await addDevice(store, "tokyo-11", { timezone: "Asia/Tokyo", hour: 11 }); // :30

    const summary = await runDigestSend(deps);
    assert.equal(summary.sent, 1);
    assert.equal(sent.length, 1);
    assert.notEqual(
      await store.get(digestSentKey("kolkata", "2026-09-30")),
      null
    );
    assert.equal(await store.get(digestSentKey("utc-2", "2026-09-30")), null);
  });

  it("skips devices that are off, unregistered for push, or not Pro", async () => {
    const { store, sent, deps } = setup();
    await store.set(digestKey("2026-09-30"), digestFor("2026-09-30"));
    await addDevice(store, "off", { enabled: false });
    await addDevice(store, "no-token", { token: null });
    await addDevice(store, "free", { pro: false });
    await addDevice(store, "ok");

    const summary = await runDigestSend(deps);
    assert.equal(summary.sent, 1);
    assert.equal(sent.length, 1);
    assert.equal(await store.get(digestSentKey("free", "2026-09-30")), null);
  });

  it("falls back to yesterday's digest, once", async () => {
    const { store, sent, deps, clock } = setup();
    await store.set(digestKey("2026-09-29"), digestFor("2026-09-29", 3));
    await addDevice(store, "a");

    const first = await runDigestSend(deps);
    assert.equal(first.digestDate, "2026-09-29");
    assert.equal(first.sent, 1);
    assert.equal(sent[0]?.body, "Story 1 and 2 more");
    assert.deepEqual(sent[0]?.data, {
      url: "hnclient://digest/2026-09-29",
      kind: "digest",
    });

    // Still no new digest 15 minutes later in the window: nothing repeats.
    clock.now += 10 * 60_000;
    assert.equal((await runDigestSend(deps)).sent, 0);
  });

  it("skips when there is no digest at all", async () => {
    const { store, sent, deps } = setup();
    await addDevice(store, "a");
    const summary = await runDigestSend(deps);
    assert.equal(summary.digestDate, null);
    assert.equal(sent.length, 0);
  });

  it("retries next run when Expo rejects everything", async () => {
    const { store, deps } = setup();
    await store.set(digestKey("2026-09-30"), digestFor("2026-09-30"));
    await addDevice(store, "a");
    const failing = await runDigestSend({
      ...deps,
      fetch: fakeFetch((url) =>
        url.includes("getReceipts")
          ? Response.json({ data: {} })
          : new Response("down", { status: 500 })
      ),
    });
    assert.equal(failing.failed, 1);
    assert.equal(await store.get(digestSentKey("a", "2026-09-30")), null);
    assert.equal((await runDigestSend(deps)).sent, 1);
  });

  it("does not double-send when runs overlap (lock)", async () => {
    const { store, sent, deps } = setup();
    await store.set(digestKey("2026-09-30"), digestFor("2026-09-30"));
    await addDevice(store, "a");
    await Promise.all([runDigestSend(deps), runDigestSend(deps)]);
    assert.equal(sent.length, 1);
  });

  it("stops at the time budget and reports a partial run", async () => {
    const { store, sent, deps } = setup();
    await store.set(digestKey("2026-09-30"), digestFor("2026-09-30"));
    await addDevice(store, "a");
    let calls = 0;
    const summary = await runDigestSend({
      ...deps,
      budgetMs: 1000,
      now: () => NOW + 2000 * calls++,
    });
    assert.equal(summary.partial, true);
    assert.equal(sent.length, 0);
  });

  it("sends in a DST-shifted hour (New York, EST vs EDT)", async () => {
    // 08:00 EST = 13:00 UTC on 2026-11-02.
    const { store, sent, deps } = setup(Date.parse("2026-11-02T13:00:00Z"));
    await store.set(digestKey("2026-11-02"), digestFor("2026-11-02"));
    await addDevice(store, "ny", { timezone: "America/New_York", hour: 8 });
    assert.equal((await runDigestSend(deps)).sent, 1);
    assert.equal(sent.length, 1);
  });
});

describe("handleDigestSendCron", () => {
  it("requires the cron secret", async () => {
    const { deps } = setup();
    const denied = await handleDigestSendCron(
      new Request("https://x.test/api/cron/digest-send"),
      { ...deps, secret: "s" }
    );
    assert.equal(denied.status, 401);
    const ok = await handleDigestSendCron(
      new Request("https://x.test/api/cron/digest-send", {
        headers: { Authorization: "Bearer s" },
      }),
      { ...deps, secret: "s" }
    );
    assert.equal(ok.status, 200);
  });
});
