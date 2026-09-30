import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MAX_RECENT_SEARCHES,
  withRecentSearch,
} from "@/lib/hn/local/recent-searches";

describe("withRecentSearch", () => {
  it("puts the new term first", () => {
    assert.deepEqual(withRecentSearch(["a", "b"], "c"), ["c", "a", "b"]);
  });

  it("moves a case-insensitive duplicate to the front with the new casing", () => {
    assert.deepEqual(withRecentSearch(["a", "Rust", "b"], "rust"), [
      "rust",
      "a",
      "b",
    ]);
  });

  it("caps the list", () => {
    const many = Array.from({ length: MAX_RECENT_SEARCHES }, (_, i) => `t${i}`);
    const next = withRecentSearch(many, "new");
    assert.equal(next.length, MAX_RECENT_SEARCHES);
    assert.equal(next[0], "new");
    assert.equal(next.includes(`t${MAX_RECENT_SEARCHES - 1}`), false);
  });
});
