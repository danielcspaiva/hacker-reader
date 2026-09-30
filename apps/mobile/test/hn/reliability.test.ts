import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { HNAuthError, type HNAuthErrorCode } from "@/lib/hn/errors";
import { fetchJSON, isTransientFetchError } from "@/lib/hn/fetch-json";
import { fetchWithTimeout, RequestTimeoutError } from "@/lib/hn/fetch-timeout";
import { getCategoryStoryIds, getItems } from "@/lib/hn/read/firebase";
import {
  classifyHNMessage,
  findOwnCommentId,
  hnMessageText,
  parseDeleteConfirmForm,
  parseFlagState,
} from "@/lib/hn/web/parsers";
import {
  comment,
  deleteComment,
  flag,
  login,
  unvote,
  vote,
} from "@/lib/hn/web/write-api";
import { describeHNWriteError } from "@/lib/hn/write-error";

import { fakeSession, installFetch, resetRateLimiter } from "./helpers";

type FetchFake = (url: string, init?: RequestInit) => Promise<Response>;

function setFetch(fake: FetchFake): void {
  // SAFETY: the code under test only ever calls fetch(url, init); the fakes
  // match that call shape.
  globalThis.fetch = fake as typeof fetch;
}

/** A fetch that never answers and rejects with an AbortError once aborted. */
function fetchUntilAborted(): void {
  setFetch(
    (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError"))
        );
      })
  );
}

function fetchThrowsNetworkError(): void {
  setFetch(async () => {
    throw new TypeError("Network request failed");
  });
}

let fake: ReturnType<typeof installFetch> | undefined;
let originalFetch: typeof fetch;

beforeEach(() => {
  resetRateLimiter();
  originalFetch = globalThis.fetch;
});
afterEach(() => {
  fake?.restore();
  fake = undefined;
  globalThis.fetch = originalFetch;
});

async function rejection(promise: Promise<unknown>): Promise<HNAuthError> {
  try {
    await promise;
  } catch (error) {
    assert.ok(
      error instanceof HNAuthError,
      `expected HNAuthError, got ${error}`
    );
    return error;
  }
  assert.fail("expected a rejection");
}

const HEADER = `<a id="logout" href="logout?auth=L">logout</a>`;
const FULL = (inner: string) =>
  `<html><body><table id="hnmain">${HEADER}${inner}</table></body></html>`;

// Real markup, fetched 2026-09-29 with curl from a signed-out client.
const SIGNED_OUT_VOTE = `<html lang="en"><head><meta name="referrer" content="origin"></head><body>You have to be logged in to vote.<br><br> <b>Login</b><br><br> <form method="post"><table border="0"><tr><td>username:</td><td><input type="text" name="acct"></td></tr></table></form></body></html>`;
const SIGNED_OUT_FAVE = `<html><body>Please log in.<br><br> <b>Login</b><br><br> <form method="post"><table></table></form></body></html>`;

describe("fetchWithTimeout", () => {
  it("rejects with RequestTimeoutError when HN never answers", async () => {
    fetchUntilAborted();
    await assert.rejects(
      fetchWithTimeout("https://x.test/", {}, 20),
      RequestTimeoutError
    );
  });

  it("a caller abort stays an AbortError, not a timeout", async () => {
    fetchUntilAborted();
    const controller = new AbortController();
    const pending = fetchWithTimeout(
      "https://x.test/",
      { signal: controller.signal },
      5_000
    );
    controller.abort();
    await assert.rejects(
      pending,
      (error: Error) => error.name === "AbortError"
    );
  });

  it("fetchJSON forwards the caller's abort to fetch", async () => {
    fetchUntilAborted();
    const controller = new AbortController();
    const pending = fetchJSON("https://x.test", "/a", "err", controller.signal);
    controller.abort();
    await assert.rejects(
      pending,
      (error: Error) => error.name === "AbortError"
    );
  });

  it("isTransientFetchError: 5xx, 429 and network are; 404 and aborts are not", async () => {
    fake = installFetch([{ status: 503 }, { status: 404 }, { status: 429 }]);
    const transient: boolean[] = [];
    for (const path of ["/a", "/b", "/c"]) {
      try {
        await fetchJSON("https://x.test", path, "err");
        assert.fail("expected a rejection");
      } catch (error) {
        transient.push(isTransientFetchError(error));
      }
    }
    assert.deepEqual(transient, [true, false, true]);
    assert.equal(
      isTransientFetchError(new TypeError("Network request failed")),
      true
    );
    assert.equal(
      isTransientFetchError(new DOMException("x", "AbortError")),
      false
    );
  });
});

describe("read partial failures", () => {
  it("getItems retries a transient failure once", async () => {
    fake = installFetch([
      { json: { id: 1 } },
      { status: 503 },
      { json: { id: 2 } },
    ]);
    assert.deepEqual(await getItems([1, 2]), [{ id: 1 }, { id: 2 }]);
  });

  it("getItems does not retry a 404", async () => {
    fake = installFetch([{ json: { id: 1 } }, { status: 404 }]);
    assert.deepEqual(await getItems([1, 2]), [{ id: 1 }]);
    assert.equal(fake.calls.length, 2);
  });

  it("getItems throws when EVERY fetch fails (offline is not an empty page)", async () => {
    fake = installFetch([
      { status: 500 },
      { status: 500 },
      { status: 500 },
      { status: 500 },
    ]);
    await assert.rejects(getItems([1, 2]), { message: "API error: 500" });
  });

  it("getCategoryStoryIds treats a null list as no stories", async () => {
    fake = installFetch([{ json: null }]);
    assert.deepEqual(await getCategoryStoryIds("top"), []);
  });
});

describe("HN message classification", () => {
  const cases: [string, string, string][] = [
    ["signed-out vote page (real)", SIGNED_OUT_VOTE, "NOT_LOGGED_IN"],
    ["signed-out fave page (real)", SIGNED_OUT_FAVE, "NOT_LOGGED_IN"],
    ["no such item", "No such item.", "ITEM_NOT_FOUND"],
    [
      "validation required",
      "Validation required. If this doesn't work, you can email hn@ycombinator.com.",
      "CAPTCHA_REQUIRED",
    ],
    ["expired link", "Sorry, unknown or expired link.", "EXPIRED_LINK"],
    [
      "posting too fast",
      "You're posting too fast. Please slow down.",
      "RATE_LIMITED",
    ],
    [
      "serving too fast",
      "Sorry, we're not able to serve your requests this quickly.",
      "RATE_LIMITED",
    ],
  ];
  for (const [name, html, code] of cases) {
    it(`${name} -> ${code}`, () => {
      assert.equal(classifyHNMessage(hnMessageText(html))?.code, code);
    });
  }

  it("a full HN page only contributes its orange messages", () => {
    const page = FULL(
      `<div class="commtext">you have to be logged in, please slow down, no such item</div>`
    );
    assert.equal(hnMessageText(page), "");
    assert.equal(
      classifyHNMessage(
        hnMessageText(
          FULL(`<font color=#ff6600>You're posting too fast.</font>`)
        )
      )?.code,
      "RATE_LIMITED"
    );
  });

  it("unrecognised text is null", () => {
    assert.equal(classifyHNMessage("Something else entirely"), null);
  });
});

describe("parseFlagState", () => {
  it("a flag link is not flagged", () => {
    assert.deepEqual(
      parseFlagState(`<a href='flag?id=5&amp;auth=A'>flag</a>`, 5),
      { flagged: false, flagLink: "flag?id=5&auth=A" }
    );
  });

  it("only an unflag link means already flagged", () => {
    assert.deepEqual(
      parseFlagState(`<a href="flag?id=5&amp;auth=A&amp;un=1">unflag</a>`, 5),
      { flagged: true, flagLink: null }
    );
  });

  it("does not mistake another item's flag link for this one", () => {
    assert.throws(
      () =>
        parseFlagState(`${HEADER}<a href="flag?id=55&amp;auth=A">flag</a>`, 5),
      { code: "INSUFFICIENT_KARMA" }
    );
  });
});

describe("parseDeleteConfirmForm tolerance", () => {
  it("reads value-before-name, single quotes and entities", () => {
    const html = `<input value='H&amp;1' type='hidden' name='hmac'><input value="item?id=3&amp;x=1" name=goto>`;
    assert.deepEqual(parseDeleteConfirmForm(html, 8), {
      hmac: "H&1",
      goto: "item?id=3&x=1",
    });
  });

  it("a signed-out confirm page is NOT_LOGGED_IN", () => {
    assert.throws(() => parseDeleteConfirmForm(SIGNED_OUT_VOTE, 8), {
      code: "NOT_LOGGED_IN",
    });
  });
});

describe("findOwnCommentId", () => {
  const row = (id: number, user: string, extra = "") =>
    `<tr class="athing comtr" id="${id}"><td><a href="user?id=${user}" class="hnuser">${extra}${user}</a></td></tr>`;

  it("takes the newest comment by the user above the parent", () => {
    const html = FULL(
      row(11, "me") + row(30, "other") + row(20, "me") + row(9, "me")
    );
    assert.equal(findOwnCommentId(html, "me", 10), 20);
  });

  it("reads a username wrapped in <font> (new accounts) and id-first attribute order", () => {
    const html = FULL(
      `<tr id='40' class='athing comtr'><td><a class='hnuser' href='user?id=me'><font color="#3c963c">me</font></a></td></tr>`
    );
    assert.equal(findOwnCommentId(html, "me", 10), 40);
  });

  it("is null when the user has no comment on the page", () => {
    assert.equal(findOwnCommentId(FULL(row(30, "other")), "me", 10), null);
  });
});

describe("write-api request failures", () => {
  it("a dropped connection is NETWORK_ERROR, not a raw TypeError", async () => {
    fetchThrowsNetworkError();
    const err = await rejection(vote(1, fakeSession()));
    assert.equal(err.code, "NETWORK_ERROR");
  });

  it("HTTP 429 is RATE_LIMITED", async () => {
    fake = installFetch([{ status: 429 }]);
    assert.equal(
      (await rejection(vote(1, fakeSession()))).code,
      "RATE_LIMITED"
    );
  });

  it("HN's 503 'not able to serve your requests' is RATE_LIMITED", async () => {
    fake = installFetch([
      {
        status: 503,
        body: "Sorry, we're not able to serve your requests this quickly.",
      },
    ]);
    assert.equal(
      (await rejection(vote(1, fakeSession()))).code,
      "RATE_LIMITED"
    );
  });

  it("'No such item.' on the item page is ITEM_NOT_FOUND, no second request", async () => {
    fake = installFetch([{ body: "No such item." }]);
    assert.equal(
      (await rejection(vote(999, fakeSession()))).code,
      "ITEM_NOT_FOUND"
    );
    assert.equal(fake.calls.length, 1);
  });
});

describe("link actions check HN's answer", () => {
  const NOT_VOTED = `${HEADER}<a id='up_10' href='vote?id=10&amp;how=up&amp;auth=A'>`;

  it("a signed-out reply to the vote link is NOT_LOGGED_IN", async () => {
    fake = installFetch([{ body: NOT_VOTED }, { body: SIGNED_OUT_VOTE }]);
    assert.equal(
      (await rejection(vote(10, fakeSession()))).code,
      "NOT_LOGGED_IN"
    );
  });

  it("a captcha reply is CAPTCHA_REQUIRED", async () => {
    fake = installFetch([
      { body: NOT_VOTED },
      {
        body: "Validation required. If this doesn't work, you can email hn@ycombinator.com.",
      },
    ]);
    assert.equal(
      (await rejection(vote(10, fakeSession()))).code,
      "CAPTCHA_REQUIRED"
    );
  });

  it("a landing page (302 to goto, followed) counts as success", async () => {
    fake = installFetch([
      { body: NOT_VOTED },
      { body: FULL("<p>slow down, no such item, please log in</p>") },
    ]);
    await vote(10, fakeSession());
  });

  it("an expired link re-reads the page once and retries with the fresh link", async () => {
    fake = installFetch([
      { body: NOT_VOTED },
      { body: "Sorry, unknown or expired link." },
      { body: NOT_VOTED.replace("auth=A", "auth=B") },
      { body: "" },
    ]);
    await vote(10, fakeSession());
    assert.equal(
      fake.calls[3].url,
      "https://news.ycombinator.com/vote?id=10&how=up&auth=B"
    );
  });

  it("two expired links in a row surface EXPIRED_LINK", async () => {
    fake = installFetch([
      { body: NOT_VOTED },
      { body: "Sorry, unknown or expired link." },
      { body: NOT_VOTED },
      { body: "Sorry, unknown or expired link." },
    ]);
    assert.equal(
      (await rejection(vote(10, fakeSession()))).code,
      "EXPIRED_LINK"
    );
    assert.equal(fake.calls.length, 4);
  });

  it("unvote surfaces a signed-out reply too", async () => {
    fake = installFetch([
      {
        body: `${HEADER}<a id='up_10' class='nosee' href='x'><a id='un_10' href='vote?id=10&amp;how=un&amp;auth=A'>`,
      },
      { body: SIGNED_OUT_VOTE },
    ]);
    assert.equal(
      (await rejection(unvote(10, fakeSession()))).code,
      "NOT_LOGGED_IN"
    );
  });
});

describe("flag is idempotent", () => {
  it("already flagged (only an unflag link): no request, no unflag", async () => {
    fake = installFetch([
      { body: `${HEADER}<a href="flag?id=5&amp;auth=A&amp;un=1">unflag</a>` },
    ]);
    await flag(5, fakeSession());
    assert.equal(fake.calls.length, 1);
  });

  it("follows a plain flag link without an id attribute (real markup has none)", async () => {
    fake = installFetch([
      { body: `${HEADER}<a href="flag?id=5&amp;auth=A">flag</a>` },
      { body: FULL("") },
    ]);
    await flag(5, fakeSession());
    assert.equal(
      fake.calls[1].url,
      "https://news.ycombinator.com/flag?id=5&auth=A"
    );
  });

  it("a rate-limit reply is RATE_LIMITED", async () => {
    fake = installFetch([
      { body: `${HEADER}<a href="flag?id=5&amp;auth=A">flag</a>` },
      { body: "You're posting too fast. Please slow down." },
    ]);
    assert.equal(
      (await rejection(flag(5, fakeSession()))).code,
      "RATE_LIMITED"
    );
  });
});

describe("deleteComment is idempotent", () => {
  const NO_LINK = `${HEADER}<span class="commtext">[deleted]</span>`;

  it("no delete link and Firebase says deleted: resolves without a POST", async () => {
    fake = installFetch([
      { body: NO_LINK },
      { json: { id: 8, deleted: true } },
    ]);
    await deleteComment(8, fakeSession());
    assert.equal(fake.calls.length, 2);
    assert.match(fake.calls[1].url, /firebaseio\.com\/v0\/item\/8\.json$/);
  });

  it("no delete link and the item is live: CANNOT_DELETE", async () => {
    fake = installFetch([{ body: NO_LINK }, { json: { id: 8 } }]);
    assert.equal(
      (await rejection(deleteComment(8, fakeSession()))).code,
      "CANNOT_DELETE"
    );
  });

  it("no delete link and Firebase unreachable: still CANNOT_DELETE", async () => {
    fake = installFetch([{ body: NO_LINK }, { status: 500 }]);
    assert.equal(
      (await rejection(deleteComment(8, fakeSession()))).code,
      "CANNOT_DELETE"
    );
  });

  it("an expired confirm link is EXPIRED_LINK, no POST", async () => {
    fake = installFetch([
      {
        body: `${HEADER}<a href="delete-confirm?id=8&amp;goto=item%3Fid%3D3">delete</a>`,
      },
      { body: "Sorry, unknown or expired link." },
    ]);
    assert.equal(
      (await rejection(deleteComment(8, fakeSession()))).code,
      "EXPIRED_LINK"
    );
    assert.equal(fake.calls.length, 2);
  });
});

describe("comment reliability", () => {
  const FORM = `${HEADER}<form><input type="hidden" name="hmac" value="HM"></form>`;
  const OWN_ROW = (id: number, user: string) =>
    `<tr class="athing comtr" id="${id}"><td><a class="hnuser" href="user?id=${user}">${user}</a></td></tr>`;

  it("with a username, returns that user's newest comment, not any larger id", async () => {
    fake = installFetch([
      { body: FORM },
      { body: FULL(OWN_ROW(70, "someone") + OWN_ROW(60, "me")) },
    ]);
    assert.equal(await comment(50, "hi", fakeSession(), "me"), 60);
  });

  it("with a username but none found, returns null so the caller refetches", async () => {
    fake = installFetch([{ body: FORM }, { body: FULL(OWN_ROW(70, "x")) }]);
    assert.equal(await comment(50, "hi", fakeSession(), "me"), null);
  });

  it("a dropped connection during the POST is UNCONFIRMED, never retried", async () => {
    let calls = 0;
    setFetch(async () => {
      calls++;
      if (calls === 1) return new Response(FORM);
      throw new TypeError("Network request failed");
    });
    const err = await rejection(comment(50, "hi", fakeSession()));
    assert.equal(err.code, "UNCONFIRMED");
    assert.equal(calls, 2);
  });

  it("a 5xx on the POST is UNCONFIRMED", async () => {
    fake = installFetch([{ body: FORM }, { status: 502 }]);
    assert.equal(
      (await rejection(comment(50, "hi", fakeSession()))).code,
      "UNCONFIRMED"
    );
  });

  it("a 429 on the POST stays RATE_LIMITED", async () => {
    fake = installFetch([{ body: FORM }, { status: 429 }]);
    assert.equal(
      (await rejection(comment(50, "hi", fakeSession()))).code,
      "RATE_LIMITED"
    );
  });

  it("validation required -> CAPTCHA_REQUIRED", async () => {
    fake = installFetch([
      { body: FORM },
      {
        body: "Validation required. If this doesn't work, you can email hn@ycombinator.com.",
      },
    ]);
    assert.equal(
      (await rejection(comment(50, "hi", fakeSession()))).code,
      "CAPTCHA_REQUIRED"
    );
  });

  it("signed-out reply (real markup) -> NOT_LOGGED_IN", async () => {
    fake = installFetch([{ body: FORM }, { body: SIGNED_OUT_VOTE }]);
    assert.equal(
      (await rejection(comment(50, "hi", fakeSession()))).code,
      "NOT_LOGGED_IN"
    );
  });

  it("an unrecognised orange message is REJECTED with HN's words, not a silent success", async () => {
    fake = installFetch([
      { body: FORM },
      {
        body: FULL(
          `<font color=#ff6600>That comment is a duplicate.</font><textarea name="text">`
        ),
      },
    ]);
    const err = await rejection(comment(50, "hi", fakeSession()));
    assert.equal(err.code, "REJECTED");
    assert.equal(
      err.message,
      "HN rejected comment: That comment is a duplicate."
    );
  });

  it("a thread with no reply form (old or dead item) is CANNOT_COMMENT, no POST", async () => {
    fake = installFetch([{ body: `${HEADER}<span>archived</span>` }]);
    assert.equal(
      (await rejection(comment(50, "hi", fakeSession()))).code,
      "CANNOT_COMMENT"
    );
    assert.equal(fake.calls.length, 1);
  });
});

describe("login reliability", () => {
  it("a successful login landing on a front page mentioning 'banned' is not BANNED", async () => {
    fake = installFetch([
      {
        body: FULL(
          `<a class="titlelink">Too many rate limit stories: banned again</a>`
        ),
        url: "https://news.ycombinator.com/news",
      },
    ]);
    await login("u", "p");
  });

  it("validation required -> CAPTCHA_REQUIRED", async () => {
    fake = installFetch([
      {
        body: "Validation required. If this doesn't work, you can email hn@ycombinator.com.",
        url: "https://news.ycombinator.com/login",
      },
    ]);
    assert.equal((await rejection(login("u", "p"))).code, "CAPTCHA_REQUIRED");
  });

  it("a dropped connection is NETWORK_ERROR", async () => {
    fetchThrowsNetworkError();
    assert.equal((await rejection(login("u", "p"))).code, "NETWORK_ERROR");
  });
});

describe("describeHNWriteError covers every typed code", () => {
  const options = { failureMessage: "Failed." };
  const expectations: [HNAuthErrorCode, string, boolean][] = [
    ["CAPTCHA_REQUIRED", "Verification Needed", false],
    ["EXPIRED_LINK", "Please Try Again", false],
    ["ITEM_NOT_FOUND", "Not Found", false],
    ["CANNOT_COMMENT", "Comments Closed", false],
    ["CANNOT_DELETE", "Can't Delete", false],
    ["REJECTED", "Not Accepted", false],
    ["UNCONFIRMED", "Not Sure It Went Through", false],
    ["NETWORK_ERROR", "Connection Problem", false],
  ];
  for (const [code, title, report] of expectations) {
    it(`${code} -> "${title}", logout false, report ${report}`, () => {
      const result = describeHNWriteError(
        new HNAuthError("HN said so", code),
        options
      );
      assert.equal(result.title, title);
      assert.equal(result.logout, false);
      assert.equal(result.report, report);
    });
  }

  it("REJECTED shows HN's own words", () => {
    assert.equal(
      describeHNWriteError(new HNAuthError("Too long", "REJECTED"), options)
        .message,
      "Too long"
    );
  });
});
