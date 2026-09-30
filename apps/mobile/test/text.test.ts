import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_TEXT_SIZE,
  isTextSize,
  scaleFont,
  TEXT_SIZE_SCALE,
  TEXT_SIZES,
} from "@/lib/text/text-size";
import {
  hasThreadsToJump,
  nextTopLevelIndex,
  previousTopLevelIndex,
} from "@/lib/text/thread-nav";

// Rows: 0:A 1:a1 2:a2 3:B 4:b1 5:C
const depths = [0, 1, 2, 0, 1, 0];

describe("thread navigation", () => {
  it("goes to the next top-level comment", () => {
    assert.equal(nextTopLevelIndex(depths, 0), 3);
    assert.equal(nextTopLevelIndex(depths, 2), 3);
    assert.equal(nextTopLevelIndex(depths, 3), 5);
    assert.equal(nextTopLevelIndex(depths, -1), 0);
  });

  it("has no next after the last thread", () => {
    assert.equal(nextTopLevelIndex(depths, 5), undefined);
    assert.equal(nextTopLevelIndex([], -1), undefined);
  });

  it("goes to the previous top-level comment", () => {
    assert.equal(previousTopLevelIndex(depths, 5), 3);
    assert.equal(previousTopLevelIndex(depths, 3), 0);
  });

  it("goes to the start of the current thread from a reply", () => {
    assert.equal(previousTopLevelIndex(depths, 4), 3);
    assert.equal(previousTopLevelIndex(depths, 2), 0);
  });

  it("has no previous at the first thread or before any row", () => {
    assert.equal(previousTopLevelIndex(depths, 0), undefined);
    assert.equal(previousTopLevelIndex(depths, -1), undefined);
  });

  it("needs two top-level comments to show the control", () => {
    assert.equal(hasThreadsToJump([0, 1, 2]), false);
    assert.equal(hasThreadsToJump([0, 1, 0]), true);
    assert.equal(hasThreadsToJump([]), false);
  });
});

describe("text size", () => {
  it("has a multiplier for every size, default being 1", () => {
    for (const size of TEXT_SIZES) assert.ok(TEXT_SIZE_SCALE[size] > 0);
    assert.equal(TEXT_SIZE_SCALE[DEFAULT_TEXT_SIZE], 1);
  });

  it("grows monotonically", () => {
    const scales = TEXT_SIZES.map((size) => TEXT_SIZE_SCALE[size]);
    assert.deepEqual(
      scales,
      [...scales].sort((a, b) => a - b)
    );
  });

  it("validates stored values", () => {
    assert.equal(isTextSize("large"), true);
    assert.equal(isTextSize("huge"), false);
    assert.equal(isTextSize(null), false);
  });

  it("rounds scaled sizes to whole points", () => {
    assert.equal(scaleFont(15, 1.15), 17);
    assert.equal(scaleFont(22, 1), 22);
  });
});
