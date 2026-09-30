import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hnKeys } from "@/lib/hn/read/keys";
import { createProApi, ProApiError } from "@/lib/pro/api";
import { PRO_FEATURES } from "@/lib/pro/features";
import type { JsonValue } from "@/lib/pro/json";
import {
  commentsLabel,
  describeSummaryFailure,
  generatedAgo,
  parseSummaryResult,
  shouldOfferSummaryPill,
} from "@/lib/pro/summary";

import { installFetch } from "../hn/helpers";

const ID = "3f2b8f3e-6f6e-4a52-9a7e-0f1e1c2d3a4b";

const readyBody = {
  status: "ready",
  summary: {
    articleTldr: "The article says X.",
    discussion: {
      summary: "Commenters agree.",
      themes: [
        { title: "Speed", summary: "Fast.", commentIds: [1, 2] },
        { title: "", summary: "dropped", commentIds: [] },
      ],
      disagreements: [
        { question: "Use it?", sides: ["Yes", "No"] },
        { question: "One sided", sides: ["only"] },
      ],
    },
    generatedAt: "2026-09-30T12:00:00.000Z",
    commentCountAtGeneration: 120,
    model: "claude-sonnet-5-5",
  },
};

describe("parseSummaryResult", () => {
  it("parses a ready summary and drops malformed themes and disagreements", () => {
    const result = parseSummaryResult(readyBody);
    assert.equal(result?.status, "ready");
    if (result?.status !== "ready") return;
    assert.equal(result.summary.articleTldr, "The article says X.");
    assert.deepEqual(result.summary.discussion.themes, [
      { title: "Speed", summary: "Fast.", commentIds: [1, 2] },
    ]);
    assert.deepEqual(result.summary.discussion.disagreements, [
      { question: "Use it?", sides: ["Yes", "No"] },
    ]);
    assert.equal(result.summary.commentCountAtGeneration, 120);
  });

  it("understands the generating marker", () => {
    assert.deepEqual(parseSummaryResult({ status: "generating" }), {
      status: "generating",
    });
  });

  it("rejects anything else", () => {
    const bodies: JsonValue[] = [
      null,
      "x",
      {},
      { status: "ready" },
      { status: "ready", summary: { discussion: { summary: "" } } },
      { status: "ready", summary: { discussion: { summary: "s" } } },
    ];
    for (const body of bodies) {
      assert.equal(parseSummaryResult(body), null);
    }
  });
});

describe("summary helpers", () => {
  it("offers the header pill above 40 comments only", () => {
    assert.equal(shouldOfferSummaryPill(40), false);
    assert.equal(shouldOfferSummaryPill(41), true);
    assert.equal(shouldOfferSummaryPill(undefined), false);
  });

  it("formats the age footer", () => {
    const at = Date.parse("2026-09-30T12:00:00Z");
    const ago = (ms: number) => generatedAgo("2026-09-30T12:00:00Z", at + ms);
    assert.equal(ago(20_000), "just now");
    assert.equal(ago(5 * 60_000), "5 min ago");
    assert.equal(ago(3 * 3_600_000), "3 h ago");
    assert.equal(ago(50 * 3_600_000), "2 d ago");
    assert.equal(generatedAgo("nope", at), "recently");
  });

  it("pluralises comment links", () => {
    assert.equal(commentsLabel(1), "1 comment");
    assert.equal(commentsLabel(3), "3 comments");
  });

  it("explains failures", () => {
    assert.equal(describeSummaryFailure(402, "pro_required").needsPro, true);
    const limit = describeSummaryFailure(429, "daily_limit");
    assert.equal(limit.retryable, false);
    assert.match(limit.message, /tomorrow/);
    assert.equal(
      describeSummaryFailure(503, "summaries_paused").retryable,
      false
    );
    assert.equal(describeSummaryFailure(502, "summary_failed").retryable, true);
    assert.equal(describeSummaryFailure(undefined, undefined).retryable, true);
  });

  it("is an available Pro feature with its own query key", () => {
    assert.equal(
      PRO_FEATURES.find((feature) => feature.id === "ai_summaries")?.status,
      "available"
    );
    assert.deepEqual(hnKeys.storySummary(7), ["story-summary", 7]);
  });
});

describe("getStorySummary", () => {
  it("requests the story with the install id and parses the result", async () => {
    const { calls, restore } = installFetch([
      { json: readyBody },
      { status: 202, json: { status: "generating" } },
    ]);
    try {
      const api = createProApi("https://api.test");
      const ready = await api.getStorySummary(ID, 4242);
      assert.equal(ready.status, "ready");
      assert.equal(
        calls[0]?.url,
        "https://api.test/api/v1/summaries/story/4242"
      );
      assert.equal(calls[0]?.method, "GET");
      assert.equal(calls[0]?.headers.Authorization, `Bearer ${ID}`);
      assert.deepEqual(await api.getStorySummary(ID, 4242), {
        status: "generating",
      });
    } finally {
      restore();
    }
  });

  it("carries the API error code on failures", async () => {
    const { restore } = installFetch([
      { status: 429, json: { error: { code: "daily_limit", message: "x" } } },
      { json: { status: "ready" } },
    ]);
    try {
      const api = createProApi("https://api.test");
      await assert.rejects(api.getStorySummary(ID, 1), (error: ProApiError) => {
        assert.equal(error.status, 429);
        assert.equal(error.code, "daily_limit");
        return true;
      });
      // A 200 that is not a summary is an error, not an empty sheet.
      await assert.rejects(api.getStorySummary(ID, 1), (error: ProApiError) => {
        assert.equal(error.code, "invalid_response");
        return true;
      });
    } finally {
      restore();
    }
  });
});
