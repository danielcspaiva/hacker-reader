import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import type { StoryCategory } from "@/lib/hn/constants";
import {
  getFrontPageStories,
  getStoryWithComments,
  searchStories,
} from "@/lib/hn/read/algolia";
import {
  getItem,
  getItems,
  getCategoryStoryIds,
  getUser,
} from "@/lib/hn/read/firebase";
import { fetchOGMetadata } from "@/lib/link-preview/og";

import { installFetch } from "./helpers";

let fake: ReturnType<typeof installFetch>;
afterEach(() => fake?.restore());

const FIREBASE = "https://hacker-news.firebaseio.com/v0";

describe("firebase hn-api", () => {
  const ids = Array.from({ length: 100 }, (_, i) => i + 1);

  it("story lists hit the right endpoint and slice by offset/limit", async () => {
    const endpoints: [StoryCategory, string][] = [
      ["top", "topstories"],
      ["best", "beststories"],
      ["new", "newstories"],
      ["ask", "askstories"],
      ["show", "showstories"],
      ["jobs", "jobstories"],
    ];
    for (const [category, name] of endpoints) {
      fake = installFetch([{ json: ids }]);
      const result = await getCategoryStoryIds(category);
      assert.equal(fake.calls[0].url, `${FIREBASE}/${name}.json`);
      assert.equal(fake.calls[0].method, "GET");
      assert.equal(result.length, 30);
      assert.equal(result[0], 1);
      fake.restore();
    }
  });

  it("supports offset and limit", async () => {
    fake = installFetch([{ json: ids }]);
    assert.deepEqual(await getCategoryStoryIds("top", 30, 3), [31, 32, 33]);
  });

  it("returns a short page at the end of the list", async () => {
    fake = installFetch([{ json: [1, 2] }]);
    assert.deepEqual(await getCategoryStoryIds("top", 1, 30), [2]);
  });

  it("getItem / getUser urls", async () => {
    fake = installFetch([{ json: { id: 5 } }, { json: { id: "pg" } }]);
    assert.deepEqual(await getItem(5), { id: 5 });
    assert.deepEqual(await getUser("pg"), { id: "pg" });
    assert.equal(fake.calls[0].url, `${FIREBASE}/item/5.json`);
    assert.equal(fake.calls[1].url, `${FIREBASE}/user/pg.json`);
  });

  it("getItem / getUser return null for missing records", async () => {
    fake = installFetch([{ json: null }, { json: null }]);
    assert.equal(await getItem(5), null);
    assert.equal(await getUser("nobody"), null);
  });

  it("non-2xx throws 'API error: <status>'", async () => {
    fake = installFetch([{ status: 500 }]);
    await assert.rejects(getItem(1), { message: "API error: 500" });
  });

  it("getItems drops failures and null (deleted) responses, keeping order", async () => {
    fake = installFetch([
      { json: { id: 1 } },
      { status: 404 },
      { json: null },
      { json: { id: 4 } },
    ]);
    assert.deepEqual(await getItems([1, 2, 3, 4]), [{ id: 1 }, { id: 4 }]);
  });

  it("getItems([]) does not fetch", async () => {
    fake = installFetch([]);
    assert.deepEqual(await getItems([]), []);
    assert.equal(fake.calls.length, 0);
  });
});

describe("algolia-api", () => {
  it("getStoryWithComments requests /items/<id>", async () => {
    const story = { id: 9, children: [] };
    fake = installFetch([{ json: story }]);
    assert.deepEqual(await getStoryWithComments(9), story);
    assert.equal(fake.calls[0].url, "https://hn.algolia.com/api/v1/items/9");
  });

  it("searchStories builds query params in a fixed order with tags=story", async () => {
    fake = installFetch([{ json: { hits: [] } }]);
    await searchStories("rust & go", 2, 10);
    assert.equal(
      fake.calls[0].url,
      "https://hn.algolia.com/api/v1/search?query=rust+%26+go&page=2&hitsPerPage=10&tags=story"
    );
  });

  it("getFrontPageStories filters by front_page and day, sorted by points", async () => {
    const hit = (objectID: string, points: number | null) => ({
      objectID,
      title: `t${objectID}`,
      url: null,
      author: "a",
      points,
      num_comments: 0,
      created_at_i: 1,
    });
    fake = installFetch([
      {
        json: {
          hits: [hit("1", 5), hit("x", 99), hit("2", 50), hit("3", null)],
        },
      },
    ]);
    const items = await getFrontPageStories(100, 200);
    assert.equal(
      fake.calls[0].url,
      "https://hn.algolia.com/api/v1/search?tags=front_page&numericFilters=created_at_i%3E%3D100%2Ccreated_at_i%3C200&hitsPerPage=30"
    );
    assert.deepEqual(
      items.map((item) => item.id),
      [2, 1, 3]
    );
  });

  it("searchStories defaults to page 0, 30 hits", async () => {
    fake = installFetch([{ json: { hits: [] } }]);
    await searchStories("x");
    assert.match(fake.calls[0].url, /page=0&hitsPerPage=30&tags=story$/);
  });

  it("searchStories uses /search_by_date, comment tags and filters from options", async () => {
    fake = installFetch([{ json: { hits: [] } }]);
    await searchStories("x", 0, 30, undefined, {
      sort: "date",
      scope: "comment",
      dateRange: "week",
      minPoints: 100,
    });
    const url = new URL(fake.calls[0].url);
    assert.equal(url.pathname, "/api/v1/search_by_date");
    assert.equal(url.searchParams.get("tags"), "comment");
    // points are a story-only filter
    assert.match(
      url.searchParams.get("numericFilters") ?? "",
      /^created_at_i>\d+$/
    );
  });

  it("non-2xx throws 'Algolia API error: <status>'", async () => {
    fake = installFetch([{ status: 429 }]);
    await assert.rejects(getStoryWithComments(1), {
      message: "Algolia API error: 429",
    });
  });
});

describe("og-api fetchOGMetadata", () => {
  function reply(html: string) {
    return { body: html, headers: undefined };
  }

  it("returns null when the response is not ok", async () => {
    fake = installFetch([{ status: 404 }]);
    assert.equal(await fetchOGMetadata("https://a.dev"), null);
  });

  it("returns null when there is no image (even with a title)", async () => {
    fake = installFetch([
      reply(`<head><meta property="og:title" content="T"></head>`),
    ]);
    assert.equal(await fetchOGMetadata("https://a.dev"), null);
  });

  it("INTENTIONAL: decodes OG entities once and leaves out-of-range numerics literal", async () => {
    fake = installFetch([
      reply(
        `<head><meta property="og:title" content="A &#38;amp; B &#1114112;"><meta property="og:image" content="https://a.dev/i.png"></head>`
      ),
      { contentType: "image/png" },
    ]);
    const og = await fetchOGMetadata("https://a.dev");
    assert.equal(og?.title, "A &amp; B &#1114112;");
  });

  it("sends the compat UA header", async () => {
    fake = installFetch([reply("<head></head>")]);
    await fetchOGMetadata("https://a.dev");
    assert.equal(
      fake.calls[0].headers["User-Agent"],
      "Mozilla/5.0 (compatible; HNClient/1.0)"
    );
  });

  it("returns null and skips the HEAD check for a relative image that fails validation", async () => {
    fake = installFetch([
      reply(`<head><meta property="og:image" content="/i.png"></head>`),
      { status: 404 },
    ]);
    assert.equal(await fetchOGMetadata("https://a.dev/post"), null);
    assert.equal(fake.calls[1].method, "HEAD");
    assert.equal(fake.calls[1].url, "https://a.dev/i.png");
  });
});
