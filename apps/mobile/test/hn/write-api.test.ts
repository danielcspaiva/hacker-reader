import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { HNAuthError } from "@/lib/hn/errors";
import {
  comment,
  deleteComment,
  flag,
  login,
  unvote,
  vote,
} from "@/lib/hn/web/write-api";

import {
  FAKE_COOKIE,
  fakeSession,
  installFetch,
  resetRateLimiter,
} from "./helpers";

let fake: ReturnType<typeof installFetch>;

beforeEach(() => {
  resetRateLimiter();
});
afterEach(() => {
  fake?.restore();
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

const VOTE_PAGE = `<a id="up_10" href="vote?id=10&amp;how=up&amp;auth=AUTH">`;

describe("authenticated request shape", () => {
  it("vote: GET item page then GET the decoded vote link, both with cookie + UA", async () => {
    fake = installFetch([{ body: VOTE_PAGE }, { body: "" }]);
    await vote(10, fakeSession());

    assert.equal(fake.calls.length, 2);
    assert.equal(fake.calls[0].url, "https://news.ycombinator.com/item?id=10");
    assert.equal(fake.calls[0].method, "GET");
    assert.equal(
      fake.calls[1].url,
      "https://news.ycombinator.com/vote?id=10&how=up&auth=AUTH"
    );
    for (const call of fake.calls) {
      assert.equal(call.headers.Cookie, FAKE_COOKIE);
      assert.equal(call.headers["User-Agent"], "HN-Client/1.0 (Mobile)");
    }
  });

  it("unvote uses the un_ link", async () => {
    fake = installFetch([
      { body: `<a id="un_10" href="vote?id=10&amp;how=un&amp;auth=A">` },
      {},
    ]);
    await unvote(10, fakeSession());
    assert.equal(
      fake.calls[1].url,
      "https://news.ycombinator.com/vote?id=10&how=un&auth=A"
    );
  });

  it("flag follows its parsed link", async () => {
    fake = installFetch([
      { body: `<a id="flag_1" href="flag?id=1&amp;auth=A">` },
      {},
    ]);
    const session = fakeSession();
    await flag(1, session);
    assert.deepEqual(
      fake.calls.filter((_, i) => i % 2 === 1).map((c) => c.url),
      ["https://news.ycombinator.com/flag?id=1&auth=A"]
    );
  });

  it("non-2xx becomes NETWORK_ERROR with status text", async () => {
    fake = installFetch([{ status: 503, statusText: "Service Unavailable" }]);
    const err = await rejection(vote(10, fakeSession()));
    assert.equal(err.code, "NETWORK_ERROR");
    assert.equal(err.message, "HN request failed: 503 Service Unavailable");
  });

  it("a parse failure stops before the second request", async () => {
    fake = installFetch([{ body: "<p>login</p>" }]);
    const err = await rejection(vote(10, fakeSession()));
    assert.equal(err.code, "NOT_LOGGED_IN");
    assert.equal(fake.calls.length, 1);
  });
});

describe("comment", () => {
  const FORM = `<form><input type="hidden" name="hmac" value="HM"></form>`;

  it("POSTs a form body with parent, goto, hmac, text and returns the new id", async () => {
    fake = installFetch([
      { body: FORM },
      {
        body: `<a href="item?id=50">a</a><a href="item?id=99">new</a><a href="item?id=7">old</a>`,
      },
    ]);
    const id = await comment(50, "hello & <world>", fakeSession());

    assert.equal(id, 99);
    const post = fake.calls[1];
    assert.equal(post.url, "https://news.ycombinator.com/comment");
    assert.equal(post.method, "POST");
    assert.equal(
      post.headers["Content-Type"],
      "application/x-www-form-urlencoded"
    );
    assert.equal(post.headers.Cookie, FAKE_COOKIE);
    const params = new URLSearchParams(post.body);
    assert.deepEqual(Object.fromEntries(params), {
      parent: "50",
      goto: "item?id=50",
      hmac: "HM",
      text: "hello & <world>",
    });
    assert.deepEqual([...params.keys()], ["parent", "goto", "hmac", "text"]);
  });

  it("returns null when no other item id is in the response", async () => {
    fake = installFetch([
      { body: FORM },
      { body: `<a href="item?id=50">a</a>` },
    ]);
    assert.equal(await comment(50, "x", fakeSession()), null);
  });

  it("returns null when the response has no item links", async () => {
    fake = installFetch([{ body: FORM }, { body: "ok" }]);
    assert.equal(await comment(50, "x", fakeSession()), null);
  });

  it("picks the maximum id, even unrelated larger ones", async () => {
    fake = installFetch([
      { body: FORM },
      { body: `item?id=51 item?id=5000000 item?id=50` },
    ]);
    assert.equal(await comment(50, "x", fakeSession()), 5000000);
  });

  it("missing form hmac while logged out -> NOT_LOGGED_IN, no POST", async () => {
    fake = installFetch([{ body: "<a>login</a>" }]);
    const err = await rejection(comment(50, "x", fakeSession()));
    assert.equal(err.code, "NOT_LOGGED_IN");
    assert.equal(fake.calls.length, 1);
  });

  describe("checkForCommentErrors branches (verbatim)", () => {
    const cases: [string, string, string, string][] = [
      [
        "bad login",
        "Bad login.",
        "NOT_LOGGED_IN",
        "Session expired - please log in again",
      ],
      [
        "unknown or expired link",
        "Unknown or expired link.",
        "NOT_LOGGED_IN",
        "Session expired - please log in again",
      ],
      [
        "submitting too fast",
        "You're submitting too fast.",
        "RATE_LIMITED",
        "You are posting too fast. Please wait.",
      ],
      [
        "slow down",
        "Please slow down.",
        "RATE_LIMITED",
        "You are posting too fast. Please wait.",
      ],
      [
        "insufficient karma",
        "Insufficient karma",
        "INSUFFICIENT_KARMA",
        "Insufficient karma to comment",
      ],
      [
        "can't comment",
        "You can't comment yet",
        "INSUFFICIENT_KARMA",
        "Insufficient karma to comment",
      ],
      ["blank", "This is blank", "PARSE_ERROR", "Comment cannot be blank"],
      [
        "empty comment",
        "An empty comment",
        "PARSE_ERROR",
        "Comment cannot be blank",
      ],
    ];

    for (const [name, html, code, message] of cases) {
      it(`${name} -> ${code}`, async () => {
        fake = installFetch([{ body: FORM }, { body: html }]);
        const err = await rejection(comment(50, "x", fakeSession()));
        assert.equal(err.code, code);
        assert.equal(err.message, message);
      });
    }

    it("is case-insensitive", async () => {
      fake = installFetch([{ body: FORM }, { body: "BAD LOGIN" }]);
      const err = await rejection(comment(50, "x", fakeSession()));
      assert.equal(err.code, "NOT_LOGGED_IN");
    });

    // A normal item page: it has a table and the reply form's textarea.
    const ITEM_PAGE = (inner: string) =>
      `<table><tr><td>${inner}</td></tr></table><form><textarea name="text"></textarea></form>`;

    it('INTENTIONAL: error words on a normal page are not errors (target="_blank", \'slow down\', "can\'t comment")', async () => {
      fake = installFetch([
        { body: FORM },
        {
          body: ITEM_PAGE(
            `<a href="item?id=99" target="_blank">ok</a> please slow down, you can't comment on bad login, unknown or expired link`
          ),
        },
      ]);
      assert.equal(await comment(50, "x", fakeSession()), 99);
    });

    it("INTENTIONAL: HN's orange form message is classified", async () => {
      fake = installFetch([
        { body: FORM },
        {
          body: ITEM_PAGE(
            `<font color="#ff6600">You're posting too fast. Please slow down.</font>`
          ),
        },
      ]);
      const err = await rejection(comment(50, "x", fakeSession()));
      assert.equal(err.code, "RATE_LIMITED");
    });

    it("textarea error with a message -> PARSE_ERROR carrying that message", async () => {
      const html = `<font color="#ff6600">Text is too long</font><br><font color="#ff6600">*</font><textarea name="text">`;
      fake = installFetch([{ body: FORM }, { body: html }]);
      const err = await rejection(comment(50, "x", fakeSession()));
      assert.equal(err.code, "PARSE_ERROR");
      assert.equal(err.message, "HN rejected comment: Text is too long");
    });

    it("textarea error with only '*' -> generic rejected message", async () => {
      const html = `<font color="#ff6600">*</font><textarea name="text">`;
      fake = installFetch([{ body: FORM }, { body: html }]);
      const err = await rejection(comment(50, "x", fakeSession()));
      assert.equal(err.code, "PARSE_ERROR");
      assert.equal(
        err.message,
        "HN rejected your comment. Possible reasons: comment too short, contains invalid characters, or account restrictions. Please try posting directly on news.ycombinator.com to see the specific error."
      );
    });

    it("textarea marker with no other message -> generic rejected message", async () => {
      const html = `<font color="#ff6600">  *  </font> <textarea name="text">`;
      fake = installFetch([{ body: FORM }, { body: html }]);
      const err = await rejection(comment(50, "x", fakeSession()));
      assert.match(err.message, /^HN rejected your comment\./);
    });
  });
});

describe("deleteComment", () => {
  const ITEM = `<a href="delete-confirm?id=8&amp;goto=item%3Fid%3D3">delete</a>`;

  it("GETs confirm page then POSTs /xdelete with id, goto, hmac, d=Yes", async () => {
    fake = installFetch([
      { body: ITEM },
      {
        body: `<input type="hidden" name="goto" value="item?id=3"><input type="hidden" name="hmac" value="H1">`,
      },
      {},
    ]);
    await deleteComment(8, fakeSession());

    assert.equal(
      fake.calls[1].url,
      "https://news.ycombinator.com/delete-confirm?id=8&goto=item%3Fid%3D3"
    );
    const post = fake.calls[2];
    assert.equal(post.url, "https://news.ycombinator.com/xdelete");
    assert.equal(post.method, "POST");
    assert.equal(post.headers.Cookie, FAKE_COOKIE);
    assert.equal(
      post.headers["Content-Type"],
      "application/x-www-form-urlencoded"
    );
    assert.deepEqual(
      [...new URLSearchParams(post.body)],
      [
        ["id", "8"],
        ["goto", "item?id=3"],
        ["hmac", "H1"],
        ["d", "Yes"],
      ]
    );
  });

  it("defaults goto to item?id=<id> when the confirm page has none", async () => {
    fake = installFetch([
      { body: ITEM },
      { body: `<input name="hmac" value="H1">` },
      {},
    ]);
    await deleteComment(8, fakeSession());
    assert.equal(
      new URLSearchParams(fake.calls[2].body).get("goto"),
      "item?id=8"
    );
  });

  it("missing hmac on the confirm page -> PARSE_ERROR, no POST", async () => {
    fake = installFetch([{ body: ITEM }, { body: "<p>no form</p>" }]);
    const err = await rejection(deleteComment(8, fakeSession()));
    assert.equal(err.code, "PARSE_ERROR");
    assert.equal(err.message, "Delete confirmation HMAC not found");
    assert.equal(fake.calls.length, 2);
  });
});

describe("login", () => {
  const cases: [string, string, string, string][] = [
    [
      "bad login",
      "Bad login.",
      "INVALID_CREDENTIALS",
      "Invalid username or password",
    ],
    [
      "unknown or expired",
      "Unknown or expired token",
      "INVALID_CREDENTIALS",
      "Invalid username or password",
    ],
    [
      "banned",
      "This account is banned",
      "BANNED",
      "Account is banned or inactive",
    ],
    [
      "account is not active",
      "Account is not active",
      "BANNED",
      "Account is banned or inactive",
    ],
    [
      "too many",
      "Too many attempts",
      "RATE_LIMITED",
      "Too many login attempts. Please wait and try again.",
    ],
    [
      "slow down",
      "slow down!",
      "RATE_LIMITED",
      "Too many login attempts. Please wait and try again.",
    ],
    [
      "rate limit",
      "rate limit hit",
      "RATE_LIMITED",
      "Too many login attempts. Please wait and try again.",
    ],
  ];

  for (const [name, html, code, message] of cases) {
    it(`${name} -> ${code}`, async () => {
      fake = installFetch([
        { body: html, url: "https://news.ycombinator.com/login" },
      ]);
      const err = await rejection(login("u", "p"));
      assert.equal(err.code, code);
      assert.equal(err.message, message);
    });
  }

  it("response url still on /login -> INVALID_CREDENTIALS", async () => {
    fake = installFetch([
      { body: "<form>", url: "https://news.ycombinator.com/login?goto=news" },
    ]);
    const err = await rejection(login("u", "p"));
    assert.equal(err.code, "INVALID_CREDENTIALS");
    assert.equal(err.message, "Login failed - please check your credentials");
  });

  it("success when redirected elsewhere; POSTs acct+pw with no Cookie header", async () => {
    fake = installFetch([
      { body: "<html>news</html>", url: "https://news.ycombinator.com/news" },
    ]);
    await login("dan", "p&ss word");
    const [call] = fake.calls;
    assert.equal(call.url, "https://news.ycombinator.com/login");
    assert.equal(call.method, "POST");
    assert.deepEqual(call.headers, {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "HN-Client/1.0 (Mobile)",
    });
    assert.equal(call.body, "acct=dan&pw=p%26ss+word");
  });

  it("keyword checks take precedence over the url check", async () => {
    fake = installFetch([
      { body: "banned", url: "https://news.ycombinator.com/login" },
    ]);
    assert.equal((await rejection(login("u", "p"))).code, "BANNED");
  });

  it("does not throw on non-2xx (unlike authenticated requests)", async () => {
    fake = installFetch([
      { status: 500, body: "ok", url: "https://news.ycombinator.com/news" },
    ]);
    await login("u", "p");
  });
});
