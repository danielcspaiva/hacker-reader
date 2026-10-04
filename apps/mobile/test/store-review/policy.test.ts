import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isReviewPromptState,
  MIN_DAYS_BETWEEN_PROMPTS,
  MIN_DAYS_SINCE_FIRST_READ,
  MIN_STORIES_READ,
  type ReviewPromptState,
  shouldPromptForReview,
  withPrompt,
  withStoryRead,
} from "@/lib/store-review/policy";

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 9, 1);

const engaged: ReviewPromptState = {
  storiesRead: MIN_STORIES_READ,
  firstReadAt: T0,
  lastPromptAt: null,
  lastPromptVersion: null,
};
const later = T0 + MIN_DAYS_SINCE_FIRST_READ * DAY;

describe("withStoryRead", () => {
  it("starts the count on the first read", () => {
    assert.deepEqual(withStoryRead(null, T0), {
      storiesRead: 1,
      firstReadAt: T0,
      lastPromptAt: null,
      lastPromptVersion: null,
    });
  });

  it("keeps the first-read time", () => {
    const next = withStoryRead(engaged, later);
    assert.equal(next.storiesRead, MIN_STORIES_READ + 1);
    assert.equal(next.firstReadAt, T0);
  });
});

describe("shouldPromptForReview", () => {
  it("asks an engaged reader after the waiting period", () => {
    assert.equal(shouldPromptForReview(engaged, later, "1.4.1"), true);
  });

  it("waits for enough stories", () => {
    const state = { ...engaged, storiesRead: MIN_STORIES_READ - 1 };
    assert.equal(shouldPromptForReview(state, later, "1.4.1"), false);
  });

  it("waits for days since the first read", () => {
    assert.equal(shouldPromptForReview(engaged, later - 1, "1.4.1"), false);
  });

  it("never asks twice on the same version", () => {
    const prompted = withPrompt(engaged, later, "1.4.1");
    const muchLater = later + 365 * DAY;
    assert.equal(shouldPromptForReview(prompted, muchLater, "1.4.1"), false);
    assert.equal(shouldPromptForReview(prompted, muchLater, "1.5.0"), true);
  });

  it("spaces prompts across versions", () => {
    const prompted = withPrompt(engaged, later, "1.4.1");
    const tooSoon = later + (MIN_DAYS_BETWEEN_PROMPTS - 1) * DAY;
    assert.equal(shouldPromptForReview(prompted, tooSoon, "1.5.0"), false);
  });

  it("ignores missing state", () => {
    assert.equal(shouldPromptForReview(null, later, "1.4.1"), false);
  });
});

describe("isReviewPromptState", () => {
  it("rejects malformed stored values", () => {
    assert.equal(isReviewPromptState(engaged), true);
    assert.equal(isReviewPromptState({ storiesRead: "3" }), false);
    assert.equal(isReviewPromptState(null), false);
  });
});
