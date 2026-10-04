import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  READABLE_MAX_WIDTH,
  SIDEBAR_WIDTH,
  WIDE_LAYOUT_MIN_WIDTH,
  isWideLayout,
  readableGutter,
  sidebarWidth,
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

describe("sidebarWidth", () => {
  it("keeps the landscape column at the fixed width", () => {
    assert.equal(sidebarWidth(1210, 834), SIDEBAR_WIDTH);
    assert.equal(sidebarWidth(1366, 1024), SIDEBAR_WIDTH);
  });

  it("gives an 11-inch portrait iPad a narrower list than the article", () => {
    const list = sidebarWidth(834, 1210);
    assert.equal(list, 350);
    assert.ok(list < 834 - list);
  });

  it("holds a 13-inch portrait iPad at the landscape width", () => {
    assert.equal(sidebarWidth(1032, 1376), SIDEBAR_WIDTH);
  });

  it("clamps a just-wide portrait window and a very large one", () => {
    assert.equal(sidebarWidth(768, 1024), 323);
    assert.equal(sidebarWidth(1400, 2000), SIDEBAR_WIDTH);
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
