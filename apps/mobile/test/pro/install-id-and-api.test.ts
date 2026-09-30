import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createProApi, ProApiError } from "@/lib/pro/api";
import { isInstallId } from "@/lib/pro/install-id-format";

import { installFetch } from "../hn/helpers";

const ID = "3f2b8f3e-6f6e-4a52-9a7e-0f1e1c2d3a4b";

describe("isInstallId", () => {
  it("accepts UUID v4 only", () => {
    assert.equal(isInstallId(ID), true);
    assert.equal(isInstallId(null), false);
    assert.equal(isInstallId(""), false);
    assert.equal(isInstallId("3f2b8f3e-6f6e-1a52-9a7e-0f1e1c2d3a4b"), false);
    assert.equal(isInstallId(ID.toUpperCase()), false);
  });
});

describe("createProApi", () => {
  it("is not configured without a base URL", () => {
    assert.equal(createProApi("").isConfigured, false);
  });

  it("registers a device with the install id as bearer token", async () => {
    const { calls, restore } = installFetch([{ json: { installId: ID } }]);
    try {
      const api = createProApi("https://api.test/");
      await api.registerDevice(ID, {
        platform: "ios",
        appVersion: "1.5.0",
        timezone: "Europe/Lisbon",
      });
      assert.equal(calls[0]?.url, "https://api.test/api/v1/devices");
    } finally {
      restore();
    }
  });

  it("sends the request shape the API expects", async () => {
    const { calls, restore } = installFetch([
      { json: { installId: ID } },
      { json: { deleted: true } },
      { json: { pro: true, features: [] } },
    ]);
    try {
      const api = createProApi("https://api.test");
      await api.registerDevice(ID, {
        platform: "ios",
        appVersion: "1.5.0",
        timezone: "UTC",
        hnUsername: null,
      });
      await api.deleteProData(ID);
      const me = await api.getMe(ID);

      assert.equal(me.pro, true);
      assert.deepEqual(
        calls.map((call) => [call.method, call.url]),
        [
          ["POST", "https://api.test/api/v1/devices"],
          ["DELETE", "https://api.test/api/v1/devices"],
          ["GET", "https://api.test/api/v1/me"],
        ]
      );
      assert.equal(calls[0]?.headers.Authorization, `Bearer ${ID}`);
      assert.equal(calls[0]?.headers["Content-Type"], "application/json");
      assert.deepEqual(JSON.parse(calls[0]?.body ?? ""), {
        platform: "ios",
        appVersion: "1.5.0",
        timezone: "UTC",
        hnUsername: null,
      });
      assert.equal(calls[1]?.body, undefined);
    } finally {
      restore();
    }
  });

  it("throws ProApiError with the status on a failed response", async () => {
    const { restore } = installFetch([{ status: 402, json: {} }]);
    try {
      const api = createProApi("https://api.test");
      await assert.rejects(api.getMe(ID), (error: ProApiError) => {
        assert.equal(error.name, "ProApiError");
        assert.equal(error.status, 402);
        return true;
      });
    } finally {
      restore();
    }
  });
});
