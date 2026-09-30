import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  READABLE_MAX_WIDTH,
  WIDE_LAYOUT_MIN_WIDTH,
  isWideLayout,
  readableGutter,
} from "@/lib/layout/breakpoints";

describe("isWideLayout", () => {
  it("is false for phones and narrow Split View windows", () => {
    assert.equal(isWideLayout(390), false);
    assert.equal(isWideLayout(WIDE_LAYOUT_MIN_WIDTH - 1), false);
  });

  it("is true from the breakpoint up", () => {
    assert.equal(isWideLayout(WIDE_LAYOUT_MIN_WIDTH), true);
    assert.equal(isWideLayout(1366), true);
  });
});

describe("readableGutter", () => {
  it("keeps the minimum gutter when the container is narrow", () => {
    assert.equal(readableGutter(390, 16), 16);
    assert.equal(readableGutter(READABLE_MAX_WIDTH, 16), 16);
  });

  it("centres a capped column in a wide container", () => {
    assert.equal(readableGutter(READABLE_MAX_WIDTH + 200, 16), 100);
  });
});
