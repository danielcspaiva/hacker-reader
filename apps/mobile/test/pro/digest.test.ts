import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isDigestSettingsEntry } from "@/lib/hn/digest";
import { hnKeys } from "@/lib/hn/read/keys";
import { createProApi, ProApiError } from "@/lib/pro/api";
import {
  COMMON_DIGEST_HOURS,
  describeDigestFailure,
  formatDigestDate,
  formatDigestHour,
  isDigestHour,
  parseDigest,
} from "@/lib/pro/digest";
import { PRO_FEATURES } from "@/lib/pro/features";
import type { JsonValue } from "@/lib/pro/json";

import { installFetch } from "../hn/helpers";

const ID = "3f2b8f3e-6f6e-4a52-9a7e-0f1e1c2d3a4b";

const stories: JsonValue[] = [
  {
    id: 11,
    title: "A story",
    url: "https://a.example/x",
    domain: "a.example",
    points: 420,
    comments: 88,
    blurb: "  Why it matters.  ",
  },
  { id: 12, title: "No blurb", points: "many" },
  { id: -1, title: "bad id" },
  { id: 13, title: "  " },
  "junk",
];

const body: JsonValue = {
  date: "2026-09-30",
  generatedAt: "2026-09-30T05:00:03.000Z",
  stories,
};

describe("parseDigest", () => {
  it("keeps valid stories and tidies them", () => {
    const digest = parseDigest(body);
    assert.equal(digest?.date, "2026-09-30");
    assert.deepEqual(
      digest?.stories.map((s) => s.id),
      [11, 12]
    );
    assert.equal(digest?.stories[0]?.blurb, "Why it matters.");
    assert.deepEqual(digest?.stories[1], {
      id: 12,
      title: "No blurb",
      url: "",
      domain: "",
      points: 0,
      comments: 0,
      blurb: "",
    });
  });

  it("rejects bodies that are not a digest", () => {
    assert.equal(parseDigest(null), null);
    assert.equal(parseDigest({ date: "2026-02-30", stories }), null);
    assert.equal(parseDigest({ date: "2026-09-30", stories: "x" }), null);
    assert.equal(parseDigest({ date: "2026-09-30", stories: [] }), null);
  });
});

describe("digest formatting", () => {
  it("formats hours and the digest day", () => {
    assert.equal(formatDigestHour(8, "en-US").replace(/\s/g, " "), "8 AM");
    assert.equal(formatDigestHour(18, "en-US").replace(/\s/g, " "), "6 PM");
    assert.equal(formatDigestDate("2026-09-30"), "Wednesday, September 30");
    assert.equal(formatDigestDate("nope"), "nope");
  });

  it("knows which hours are valid", () => {
    assert.equal(isDigestHour(0), true);
    assert.equal(isDigestHour(23), true);
    for (const bad of [-1, 24, 7.5, "8", null]) {
      assert.equal(isDigestHour(bad), false);
    }
    assert.ok(COMMON_DIGEST_HOURS.every(isDigestHour));
  });

  it("validates the stored setting", () => {
    assert.equal(isDigestSettingsEntry({ enabled: true, hour: 8 }), true);
    assert.equal(isDigestSettingsEntry({ enabled: true, hour: 24 }), false);
    assert.equal(isDigestSettingsEntry({ enabled: "yes", hour: 8 }), false);
    assert.equal(isDigestSettingsEntry(null), false);
  });
});

describe("describeDigestFailure", () => {
  it("maps statuses to copy", () => {
    assert.equal(describeDigestFailure(402).needsPro, true);
    assert.equal(describeDigestFailure(404).retryable, false);
    assert.equal(describeDigestFailure(503).retryable, true);
    assert.equal(describeDigestFailure(undefined).retryable, true);
  });
});

describe("proApi.getDigest", () => {
  it("fetches /api/v1/digest/:date with the install id", async () => {
    const { calls, restore } = installFetch([{ json: body }]);
    try {
      const api = createProApi("https://api.test");
      const digest = await api.getDigest(ID, "2026-09-30");
      assert.equal(digest.stories.length, 2);
      assert.equal(calls[0]?.url, "https://api.test/api/v1/digest/2026-09-30");
      assert.equal(calls[0]?.headers.Authorization, `Bearer ${ID}`);
    } finally {
      restore();
    }
  });

  it("surfaces 404 and unusable bodies as ProApiError", async () => {
    const { restore } = installFetch([
      { status: 404, json: { error: { code: "not_found", message: "x" } } },
      { json: { date: "2026-09-30", stories: [] } },
    ]);
    try {
      const api = createProApi("https://api.test");
      await assert.rejects(
        api.getDigest(ID, "2026-09-30"),
        (e: ProApiError) => {
          assert.equal(e.status, 404);
          return true;
        }
      );
      await assert.rejects(
        api.getDigest(ID, "2026-09-30"),
        (e: ProApiError) => {
          assert.equal(e.code, "invalid_response");
          return true;
        }
      );
    } finally {
      restore();
    }
  });
});

describe("digest wiring", () => {
  it("is an available Pro feature", () => {
    const feature = PRO_FEATURES.find((f) => f.id === "daily_digest");
    assert.equal(feature?.status, "available");
  });

  it("has query keys", () => {
    assert.deepEqual(hnKeys.digest("2026-09-30"), ["digest", "2026-09-30"]);
    assert.deepEqual(hnKeys.digestStories("2026-09-30"), [
      "digest-stories",
      "2026-09-30",
    ]);
    assert.deepEqual(hnKeys.dailyDigest(), ["daily-digest"]);
  });
});
