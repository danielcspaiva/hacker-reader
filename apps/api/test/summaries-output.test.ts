import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateSummaryBody } from "../lib/summaries/output";

const valid = new Set([1, 2, 3]);
const options = { validIds: valid, hasSource: true };

describe("validateSummaryBody", () => {
  it("accepts the full shape", () => {
    const body = validateSummaryBody(
      {
        articleTldr: "  The article says X.  ",
        discussion: {
          summary: "People mostly agree.",
          themes: [
            { title: "Speed", summary: "It is fast.", commentIds: [1, 2] },
          ],
          disagreements: [{ question: "Use it?", sides: ["Yes", "No"] }],
        },
      },
      options
    );
    assert.deepEqual(body, {
      articleTldr: "The article says X.",
      discussion: {
        summary: "People mostly agree.",
        themes: [
          { title: "Speed", summary: "It is fast.", commentIds: [1, 2] },
        ],
        disagreements: [{ question: "Use it?", sides: ["Yes", "No"] }],
      },
    });
  });

  it("drops comment ids that were not in the input, and duplicates", () => {
    const body = validateSummaryBody(
      {
        discussion: {
          summary: "s",
          themes: [
            {
              title: "t",
              summary: "u",
              commentIds: [1, 99, 2, 2, "3", 1.5, 3],
            },
          ],
        },
      },
      options
    );
    assert.deepEqual(body?.discussion.themes[0]?.commentIds, [1, 2, 3]);
  });

  it("drops malformed themes and disagreements instead of failing", () => {
    const body = validateSummaryBody(
      {
        discussion: {
          summary: "s",
          themes: [
            { title: "", summary: "x", commentIds: [] },
            { title: "ok", summary: "fine", commentIds: [] },
            "junk",
          ],
          disagreements: [{ question: "q", sides: ["only one"] }],
        },
      },
      options
    );
    assert.equal(body?.discussion.themes.length, 1);
    assert.equal(body?.discussion.disagreements, undefined);
  });

  it("requires a discussion summary", () => {
    assert.equal(
      validateSummaryBody({ discussion: { themes: [] } }, options),
      null
    );
    assert.equal(
      validateSummaryBody({ discussion: { summary: "  " } }, options),
      null
    );
    assert.equal(validateSummaryBody("text", options), null);
    assert.equal(validateSummaryBody(null, options), null);
  });

  it("omits articleTldr when there was no article or story text", () => {
    const raw = {
      articleTldr: "invented",
      discussion: { summary: "s", themes: [] },
    };
    assert.equal(
      validateSummaryBody(raw, { ...options, hasSource: false })?.articleTldr,
      undefined
    );
  });

  it("caps themes and overlong strings", () => {
    const themes = Array.from({ length: 20 }, (_, i) => ({
      title: `t${i}`,
      summary: "s".repeat(5000),
      commentIds: [],
    }));
    const body = validateSummaryBody(
      { discussion: { summary: "s", themes } },
      options
    );
    assert.equal(body?.discussion.themes.length, 8);
    assert.ok((body?.discussion.themes[0]?.summary.length ?? 0) <= 701);
  });
});
