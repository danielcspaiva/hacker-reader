import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { clientIp, limitByIp } from "../lib/rate-limit";
import { MemoryStore } from "./memory-store";

const request = (headers: Record<string, string> = {}) =>
  new Request("https://x.test", { headers });

describe("clientIp", () => {
  it("takes the first x-forwarded-for entry", () => {
    assert.equal(
      clientIp(request({ "x-forwarded-for": " 203.0.113.7 , 10.0.0.1" })),
      "203.0.113.7"
    );
  });

  it("falls back to x-real-ip, then unknown", () => {
    assert.equal(
      clientIp(request({ "x-real-ip": "198.51.100.2" })),
      "198.51.100.2"
    );
    assert.equal(clientIp(request({ "x-forwarded-for": "" })), "unknown");
    assert.equal(clientIp(request()), "unknown");
  });
});

describe("limitByIp", () => {
  it("allows 60 requests per minute per IP, then answers 429", async () => {
    const store = new MemoryStore();
    const req = request({ "x-forwarded-for": "203.0.113.7" });
    for (let i = 0; i < 60; i++) {
      assert.equal(await limitByIp(store, req, "me"), null);
    }
    const blocked = await limitByIp(store, req, "me");
    assert.equal(blocked?.status, 429);
    assert.ok(Number(blocked?.headers.get("retry-after")) >= 1);

    const other = request({ "x-forwarded-for": "203.0.113.8" });
    assert.equal(await limitByIp(store, other, "me"), null);
  });
});
