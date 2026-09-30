import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { requirePro } from "../lib/auth";
import { requireCron } from "../lib/cron";
import { getEntitlement, parseEntitlement, toMe } from "../lib/entitlement";
import type { JsonValue } from "../lib/json";
import { rateLimit } from "../lib/rate-limit";
import { fakeFetch, readFixture } from "./helpers";
import { MemoryStore } from "./memory-store";

const ID = "3f2b8f3e-6f6e-4a52-9a7e-0f1e1c2d3a4b";
const fixture = readFixture("subscriber-pro.json");
const before = Date.parse("2026-09-30T12:00:00Z");
const after = Date.parse("2026-11-01T00:00:00Z");

describe("parseEntitlement", () => {
  it("is active before the expiry date", () => {
    assert.deepEqual(parseEntitlement(fixture, before), {
      pro: true,
      expiresAt: "2026-10-15T09:00:00.000Z",
    });
  });

  it("is inactive after the expiry date", () => {
    assert.deepEqual(parseEntitlement(fixture, after), { pro: false });
  });

  it("treats a missing expiry as lifetime", () => {
    const body = {
      subscriber: { entitlements: { pro: { expires_date: null } } },
    };
    assert.deepEqual(parseEntitlement(body, after), { pro: true });
  });

  it("counts a billing grace period as active", () => {
    const body = {
      subscriber: {
        entitlements: {
          pro: {
            expires_date: "2026-10-01T00:00:00Z",
            grace_period_expires_date: "2026-10-05T00:00:00Z",
          },
        },
      },
    };
    const now = Date.parse("2026-10-03T00:00:00Z");
    assert.equal(parseEntitlement(body, now).pro, true);
  });

  it("is inactive without the pro entitlement or on junk", () => {
    assert.equal(
      parseEntitlement({ subscriber: { entitlements: {} } }, before).pro,
      false
    );
    assert.equal(
      parseEntitlement({ subscriber: { entitlements: { other: {} } } }, before)
        .pro,
      false
    );
    assert.equal(parseEntitlement(null, before).pro, false);
    assert.equal(parseEntitlement("x", before).pro, false);
  });
});

function revenueCatFetch(body: JsonValue, status = 200) {
  const calls: { url: string; auth: string | null }[] = [];
  const fetchImpl = fakeFetch((url, init) => {
    calls.push({ url, auth: new Headers(init?.headers).get("authorization") });
    return Response.json(body, { status });
  });
  return { fakeFetch: fetchImpl, calls };
}

describe("getEntitlement", () => {
  it("fetches from RevenueCat once and then serves the cache", async () => {
    const store = new MemoryStore();
    const { fakeFetch, calls } = revenueCatFetch(fixture);
    const deps = {
      store,
      fetch: fakeFetch,
      now: () => before,
      secretKey: "sk_test",
    };

    assert.equal((await getEntitlement(ID, deps)).pro, true);
    assert.equal((await getEntitlement(ID, deps)).pro, true);

    assert.equal(calls.length, 1);
    assert.equal(
      calls[0]?.url,
      `https://api.revenuecat.com/v1/subscribers/${ID}`
    );
    assert.equal(calls[0]?.auth, "Bearer sk_test");
    assert.equal(store.ttls.get(`entitlement:${ID}`), 600);
  });

  it("does not cache past the expiry", async () => {
    const store = new MemoryStore();
    const { fakeFetch } = revenueCatFetch(fixture);
    const now = Date.parse("2026-10-15T08:59:00Z");
    await getEntitlement(ID, {
      store,
      fetch: fakeFetch,
      now: () => now,
      secretKey: "k",
    });
    assert.equal(store.ttls.get(`entitlement:${ID}`), 60);
  });

  it("throws when RevenueCat fails", async () => {
    const { fakeFetch } = revenueCatFetch({}, 500);
    await assert.rejects(
      getEntitlement(ID, {
        store: new MemoryStore(),
        fetch: fakeFetch,
        secretKey: "k",
      })
    );
  });
});

describe("toMe", () => {
  it("lists features only for Pro", () => {
    assert.equal(toMe({ pro: false }).features.length, 0);
    const me = toMe({ pro: true, expiresAt: "2026-10-15T09:00:00.000Z" });
    assert.equal(me.pro, true);
    assert.equal(me.expiresAt, "2026-10-15T09:00:00.000Z");
    assert.ok(me.features.includes("ai_summaries"));
  });
});

describe("requirePro", () => {
  const request = (id?: string) =>
    new Request("https://x.test", {
      headers: id ? { Authorization: `Bearer ${id}` } : {},
    });

  it("answers 401, 402 and passes Pro installs", async () => {
    const store = new MemoryStore();
    const base = { store, now: () => before, secretKey: "k" };

    const anonymous = await requirePro(request(), base);
    assert.equal(!anonymous.ok && anonymous.response.status, 401);

    const free = await requirePro(request(ID), {
      ...base,
      fetch: revenueCatFetch({ subscriber: { entitlements: {} } }).fakeFetch,
    });
    assert.equal(!free.ok && free.response.status, 402);

    await store.del(`entitlement:${ID}`);
    const pro = await requirePro(request(ID), {
      ...base,
      fetch: revenueCatFetch(fixture).fakeFetch,
    });
    assert.equal(pro.ok && pro.installId, ID);
  });

  it("fails closed with 503 when RevenueCat is down", async () => {
    const result = await requirePro(request(ID), {
      store: new MemoryStore(),
      fetch: revenueCatFetch({}, 500).fakeFetch,
      secretKey: "k",
    });
    assert.equal(!result.ok && result.response.status, 503);
  });
});

describe("rateLimit", () => {
  it("allows the limit per window, then blocks until the next", async () => {
    const store = new MemoryStore();
    const rule = { limit: 2, windowSeconds: 60 };
    const t = 1_000_000;
    assert.equal((await rateLimit(store, "b", ID, rule, t)).ok, true);
    assert.equal((await rateLimit(store, "b", ID, rule, t)).ok, true);
    const blocked = await rateLimit(store, "b", ID, rule, t);
    assert.equal(blocked.ok, false);
    assert.ok(
      blocked.retryAfterSeconds >= 1 && blocked.retryAfterSeconds <= 60
    );
    assert.equal((await rateLimit(store, "b", ID, rule, t + 60_000)).ok, true);
    assert.equal((await rateLimit(store, "other", ID, rule, t)).ok, true);
  });
});

describe("requireCron", () => {
  const request = (auth?: string) =>
    new Request("https://x.test", {
      headers: auth ? { Authorization: auth } : {},
    });

  it("needs the exact bearer secret", () => {
    assert.equal(requireCron(request("Bearer s3cret"), "s3cret").ok, true);
    assert.equal(requireCron(request("Bearer wrong"), "s3cret").ok, false);
    assert.equal(requireCron(request(), "s3cret").ok, false);
  });

  it("fails closed without a configured secret", () => {
    assert.equal(requireCron(request("Bearer "), "").ok, false);
    assert.equal(requireCron(request("Bearer undefined"), undefined).ok, false);
  });
});
