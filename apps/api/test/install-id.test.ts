import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { requireInstall } from "../lib/auth";
import { parseBearerInstallId, parseInstallId } from "../lib/install-id";

const ID = "3f2b8f3e-6f6e-4a52-9a7e-0f1e1c2d3a4b";

describe("parseInstallId", () => {
  it("accepts a UUID v4 and lower-cases it", () => {
    assert.equal(parseInstallId(ID.toUpperCase()), ID);
  });

  it("rejects other shapes", () => {
    for (const bad of [
      "",
      "abc",
      "3f2b8f3e-6f6e-1a52-9a7e-0f1e1c2d3a4b", // version 1
      "3f2b8f3e-6f6e-4a52-1a7e-0f1e1c2d3a4b", // bad variant
      `${ID}0`,
      ` ${ID}`,
      "$RCAnonymousID:abc",
    ]) {
      assert.equal(parseInstallId(bad), null, bad);
    }
    assert.equal(parseInstallId(undefined), null);
  });
});

describe("parseBearerInstallId", () => {
  it("reads the bearer token", () => {
    assert.equal(parseBearerInstallId(`Bearer ${ID}`), ID);
    assert.equal(parseBearerInstallId(`bearer ${ID}`), ID);
  });

  it("rejects missing, malformed and non-bearer headers", () => {
    assert.equal(parseBearerInstallId(null), null);
    assert.equal(parseBearerInstallId(ID), null);
    assert.equal(parseBearerInstallId(`Basic ${ID}`), null);
    assert.equal(parseBearerInstallId(`Bearer ${ID} extra`), null);
    assert.equal(parseBearerInstallId("Bearer nope"), null);
  });
});

describe("requireInstall", () => {
  it("returns the install id", () => {
    const req = new Request("https://x.test", {
      headers: { Authorization: `Bearer ${ID}` },
    });
    assert.deepEqual(requireInstall(req), { ok: true, installId: ID });
  });

  it("answers 401 otherwise", async () => {
    const result = requireInstall(new Request("https://x.test"));
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.response.status, 401);
  });
});
