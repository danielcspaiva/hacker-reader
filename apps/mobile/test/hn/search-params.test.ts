import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSearchParams,
  DEFAULT_SEARCH_OPTIONS,
  hasActiveFilters,
  hasNonDefaultOptions,
  hasSearchableQuery,
  parseSearchOptions,
  parseSearchQuery,
  searchEndpoint,
  type SearchDateRange,
  type SearchOptions,
} from "@/lib/hn/read/search-params";

const NOW = 1_700_000_000;
const build = (query: string, options: Partial<SearchOptions> = {}) =>
  buildSearchParams(
    query,
    { ...DEFAULT_SEARCH_OPTIONS, ...options },
    0,
    30,
    NOW
  );

describe("parseSearchQuery", () => {
  it("returns plain text untouched", () => {
    assert.deepEqual(parseSearchQuery(" rust async "), {
      text: "rust async",
      author: null,
    });
  });

  it("splits an author token from the terms, wherever it is", () => {
    assert.deepEqual(parseSearchQuery("author:pg startups"), {
      text: "startups",
      author: "pg",
    });
    assert.deepEqual(parseSearchQuery("startups author:pg"), {
      text: "startups",
      author: "pg",
    });
  });

  it("supports an author-only query", () => {
    assert.deepEqual(parseSearchQuery("author:dang"), {
      text: "",
      author: "dang",
    });
    assert.equal(hasSearchableQuery("author:dang"), true);
    assert.equal(hasSearchableQuery("   "), false);
  });

  it("does not treat a bare 'author:' or mid-word match as a token", () => {
    assert.equal(parseSearchQuery("author:").author, null);
    assert.equal(parseSearchQuery("coauthor:x").author, null);
  });
});

describe("buildSearchParams", () => {
  it("defaults to story tags in a fixed order with no numericFilters", () => {
    assert.equal(
      build("rust & go").toString(),
      "query=rust+%26+go&page=0&hitsPerPage=30&tags=story"
    );
  });

  it("switches the scope tag to comment", () => {
    assert.equal(build("x", { scope: "comment" }).get("tags"), "comment");
  });

  it("maps author:<name> to an AND author tag and drops it from the query", () => {
    const params = build("author:pg lisp");
    assert.equal(params.get("query"), "lisp");
    assert.equal(params.get("tags"), "story,author_pg");
    assert.equal(
      build("author:pg", { scope: "comment" }).get("tags"),
      "comment,author_pg"
    );
  });

  it("turns each date range into a created_at_i lower bound", () => {
    const expected: [SearchDateRange, number][] = [
      ["day", NOW - 86_400],
      ["week", NOW - 7 * 86_400],
      ["month", NOW - 30 * 86_400],
      ["year", NOW - 365 * 86_400],
    ];
    for (const [dateRange, since] of expected) {
      assert.equal(
        build("x", { dateRange }).get("numericFilters"),
        `created_at_i>${since}`
      );
    }
  });

  it("adds a points floor for stories and joins filters with a comma", () => {
    assert.equal(
      build("x", { minPoints: 100, dateRange: "day" }).get("numericFilters"),
      `created_at_i>${NOW - 86_400},points>=100`
    );
  });

  it("ignores minPoints for comments", () => {
    assert.equal(
      build("x", { scope: "comment", minPoints: 500 }).get("numericFilters"),
      null
    );
  });
});

describe("searchEndpoint", () => {
  it("maps sort to the Algolia path", () => {
    assert.equal(searchEndpoint("relevance"), "/search");
    assert.equal(searchEndpoint("date"), "/search_by_date");
  });
});

describe("option flags", () => {
  it("detects non-default options and active filters", () => {
    assert.equal(hasNonDefaultOptions(DEFAULT_SEARCH_OPTIONS), false);
    assert.equal(
      hasNonDefaultOptions({ ...DEFAULT_SEARCH_OPTIONS, sort: "date" }),
      true
    );
    assert.equal(
      hasActiveFilters({ ...DEFAULT_SEARCH_OPTIONS, sort: "date" }),
      false
    );
    assert.equal(
      hasActiveFilters({ ...DEFAULT_SEARCH_OPTIONS, minPoints: 10 }),
      true
    );
    assert.equal(
      hasActiveFilters({
        ...DEFAULT_SEARCH_OPTIONS,
        scope: "comment",
        minPoints: 10,
      }),
      false
    );
  });
});

describe("parseSearchOptions", () => {
  it("keeps valid stored values", () => {
    const stored = {
      sort: "date",
      scope: "comment",
      dateRange: "year",
      minPoints: 10,
    };
    assert.deepEqual(parseSearchOptions(stored), stored);
  });

  it("falls back per field for invalid or missing values", () => {
    assert.deepEqual(
      parseSearchOptions({
        sort: "date",
        scope: "nope",
        dateRange: 3,
        minPoints: 7,
      }),
      { ...DEFAULT_SEARCH_OPTIONS, sort: "date" }
    );
    assert.deepEqual(parseSearchOptions({}), DEFAULT_SEARCH_OPTIONS);
  });
});
