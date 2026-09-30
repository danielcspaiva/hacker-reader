import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { handleDigest } from "../lib/digest/handler";
import { digestKey, type Digest } from "../lib/digest/store";
import { fakeFetch, readFixture } from "./helpers";
import { MemoryStore } from "./memory-store";

const ID = "3f2b8f3e-6f6e-4a52-9a7e-0f1e1c2d3a4b";
const DIGEST: Digest = {
  date: "2026-09-30",
  generatedAt: "2026-09-30T05:00:00.000Z",
  stories: [
    {
      id: 1,
      title: "T",
      url: "https://a.example",
      domain: "a.example",
      points: 5,
      comments: 2,
      blurb: "B",
    },
  ],
};

function setup(pro = true) {
  const store = new MemoryStore();
  const fetchImpl = fakeFetch((url) => {
    assert.ok(url.includes("api.revenuecat.com"), url);
    return Response.json(
      pro
        ? readFixture("subscriber-pro.json")
        : { subscriber: { entitlements: {} } }
    );
  });
  const call = (
    date: string,
    options: { auth?: string | null; ip?: string } = {}
  ) => {
    const headers: Record<string, string> = {
      "x-forwarded-for": options.ip ?? "203.0.113.9",
    };
    const auth = options.auth === undefined ? `Bearer ${ID}` : options.auth;
    if (auth) headers.Authorization = auth;
    return handleDigest(
      new Request(`https://x.test/api/v1/digest/${date}`, { headers }),
      date,
      {
        store,
        fetch: fetchImpl,
        now: () => Date.parse("2026-09-30T12:00:00Z"),
        secretKey: "sk",
      }
    );
  };
  return { store, call };
}

describe("GET /api/v1/digest/:date", () => {
  it("returns the stored digest to a Pro install", async () => {
    const { store, call } = setup();
    await store.set(digestKey("2026-09-30"), DIGEST);
    const response = await call("2026-09-30");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), DIGEST);
  });

  it("404s a day without a digest", async () => {
    const { call } = setup();
    const response = await call("2026-09-29");
    assert.equal(response.status, 404);
  });

  it("rejects malformed dates before any lookup", async () => {
    const { store, call } = setup();
    for (const bad of ["2026-02-30", "latest", "2026-9-1", "..%2Fx"]) {
      const response = await call(bad);
      assert.equal(response.status, 400, bad);
    }
    assert.equal(store.values.size > 0, true); // only rate limit counters
    assert.equal(
      [...store.values.keys()].every((k) => k.startsWith("ratelimit:")),
      true
    );
  });

  it("401s without an install id and 402s without Pro", async () => {
    const anon = setup();
    await anon.store.set(digestKey("2026-09-30"), DIGEST);
    assert.equal((await anon.call("2026-09-30", { auth: null })).status, 401);

    const free = setup(false);
    await free.store.set(digestKey("2026-09-30"), DIGEST);
    assert.equal((await free.call("2026-09-30")).status, 402);
  });

  it("limits by IP before anything else", async () => {
    const { call } = setup();
    let last = 200;
    for (let i = 0; i < 61; i++) {
      last = (await call("2026-09-30", { auth: null, ip: "198.51.100.1" }))
        .status;
    }
    assert.equal(last, 429);
  });
});
