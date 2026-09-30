import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { flattenComments } from "@/lib/hn/read/comment-tree";

interface TestComment {
  id: number;
  by: string;
  time: number;
  children: TestComment[];
}

const c = (id: number, children: TestComment[] = []): TestComment => ({
  id,
  by: "u",
  time: 0,
  children,
});

const tree = [c(1, [c(2, [c(3)]), c(4)]), c(5)];

describe("flattenComments", () => {
  it("depth-first order with depth", () => {
    const flat = flattenComments(tree, 0, new Set());
    assert.deepEqual(
      flat.map((f) => [f.comment.id, f.depth]),
      [
        [1, 0],
        [2, 1],
        [3, 2],
        [4, 1],
        [5, 0],
      ]
    );
  });

  it("a collapsed comment stays but hides its whole subtree", () => {
    const flat = flattenComments(tree, 0, new Set([1]));
    assert.deepEqual(
      flat.map((f) => f.comment.id),
      [1, 5]
    );
  });

  it("collapsing a nested comment hides only its children", () => {
    const flat = flattenComments(tree, 0, new Set([2]));
    assert.deepEqual(
      flat.map((f) => f.comment.id),
      [1, 2, 4, 5]
    );
  });

  it("counts every descendant, even under a collapsed comment", () => {
    const flat = flattenComments(tree, 0, new Set([1]));
    assert.deepEqual(
      flat.map((f) => [f.comment.id, f.replyCount]),
      [
        [1, 3],
        [5, 0],
      ]
    );
  });

  it("honours a starting depth and empty input", () => {
    assert.equal(flattenComments([c(9)], 3, new Set())[0].depth, 3);
    assert.deepEqual(flattenComments([], 0, new Set()), []);
  });
});
