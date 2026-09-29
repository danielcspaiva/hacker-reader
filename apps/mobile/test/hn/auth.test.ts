import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, describe, it, mock } from "node:test";
import { inspect } from "node:util";

import { HNAuthError, isAuthError } from "@/lib/hn/errors";
import { requireSession, SecureSession } from "@/lib/hn/session";
import { HNRateLimiter } from "@/lib/hn/web/rate-limiter";
import { describeHNWriteError } from "@/lib/hn/write-error";

afterEach(() => mock.timers.reset());

describe("HNAuthError", () => {
  it("carries message, code and name; is an Error", () => {
    const err = new HNAuthError("boom", "BANNED");
    assert.equal(err.message, "boom");
    assert.equal(err.code, "BANNED");
    assert.equal(err.name, "HNAuthError");
    assert.ok(err instanceof Error);
  });

  it("isAuthError only accepts HNAuthError instances", () => {
    assert.equal(isAuthError(new HNAuthError("x", "PARSE_ERROR")), true);
    assert.equal(isAuthError(new Error("x")), false);
    assert.equal(isAuthError({ code: "PARSE_ERROR" }), false);
    assert.equal(isAuthError(null), false);
  });
});

describe("SecureSession", () => {
  const session = new SecureSession({ user: "alice&SECRETVALUE", extra: "e" });

  it("joins cookies for the Cookie header", () => {
    assert.equal(
      session.dangerouslyGetRawCookiesForFetch(),
      "user=alice&SECRETVALUE; extra=e"
    );
  });

  it("display token shows only the first 8 chars of the user cookie", () => {
    assert.equal(session.getDisplayToken(), "SecureSession(redacted)");
  });

  it("no user cookie -> 'No session' and invalid", () => {
    const empty = new SecureSession({ other: "x" });
    assert.equal(empty.getDisplayToken(), "SecureSession(redacted)");
    assert.equal(empty.hasValidSession(), false);
    assert.equal(session.hasValidSession(), true);
  });

  it("redacts in JSON.stringify, String() and template strings", () => {
    assert.equal(
      JSON.stringify(session),
      '{"display":"SecureSession(redacted)"}'
    );
    assert.equal(String(session), "SecureSession(redacted)");
    assert.equal(`${session}`, "SecureSession(redacted)");
    assert.ok(!JSON.stringify({ session }).includes("SECRETVALUE"));
  });

  it("KNOWN GAP: util.inspect (what console.log uses in Node) still shows the private field", () => {
    assert.ok(inspect(session).includes("SECRETVALUE"));
  });
});

describe("HNRateLimiter", () => {
  function silenceWarn() {
    return mock.method(console, "warn", () => {});
  }

  it("allows 30 actions in a minute without waiting", async () => {
    mock.timers.enable({ apis: ["Date", "setTimeout"], now: 1_000_000 });
    const warn = silenceWarn();
    const limiter = new HNRateLimiter();
    for (let i = 0; i < 30; i++) await limiter.throttle();
    assert.equal(warn.mock.callCount(), 0);
    warn.mock.restore();
  });

  it("the 29th action does not wait, the 31st does", async () => {
    mock.timers.enable({ apis: ["Date", "setTimeout"], now: 1_000_000 });
    const warn = silenceWarn();
    const limiter = new HNRateLimiter();
    for (let i = 0; i < 29; i++) await limiter.throttle();
    assert.equal(warn.mock.callCount(), 0);
    await limiter.throttle();

    let resolved = false;
    const pending = limiter.throttle().then(() => {
      resolved = true;
    });
    await Promise.resolve();
    assert.equal(resolved, false);
    assert.equal(warn.mock.callCount(), 1);
    assert.equal(
      warn.mock.calls[0].arguments[0],
      "[HN Rate Limit] Waiting 60s before next action"
    );

    mock.timers.tick(59_999);
    await Promise.resolve();
    assert.equal(resolved, false);
    mock.timers.tick(1);
    await pending;
    assert.equal(resolved, true);
    warn.mock.restore();
  });

  it("drops timestamps older than a minute", async () => {
    mock.timers.enable({ apis: ["Date", "setTimeout"], now: 1_000_000 });
    const warn = silenceWarn();
    const limiter = new HNRateLimiter();
    for (let i = 0; i < 30; i++) await limiter.throttle();
    mock.timers.tick(60_001);
    await limiter.throttle();
    assert.equal(warn.mock.callCount(), 0);
    warn.mock.restore();
  });

  it("reset() clears the window", async () => {
    mock.timers.enable({ apis: ["Date", "setTimeout"], now: 1_000_000 });
    const warn = silenceWarn();
    const limiter = new HNRateLimiter();
    for (let i = 0; i < 30; i++) await limiter.throttle();
    limiter.reset();
    await limiter.throttle();
    assert.equal(warn.mock.callCount(), 0);
    warn.mock.restore();
  });
});

describe("storage key literals", () => {
  const read = (path: string) =>
    readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

  it("AsyncStorage keys", () => {
    assert.match(
      read("lib/hn/local/votes.ts"),
      /VOTES_STORAGE_KEY = "hn-votes"/
    );
    assert.match(
      read("lib/hn/local/bookmarks.ts"),
      /BOOKMARKS_KEY = "@hn_bookmarks"/
    );
    assert.match(
      read("lib/hn/local/hidden.ts"),
      /HIDDEN_STORIES_KEY = "@hidden_stories"/
    );
    assert.match(
      read("lib/hn/local/blocked-users.ts"),
      /BLOCKED_USERS_KEY = "@blocked_users"/
    );
  });

  it("SecureStore keys", () => {
    const src = read("contexts/hn-auth-context.tsx");
    for (const call of ["getItemAsync", "setItemAsync", "deleteItemAsync"]) {
      assert.match(src, new RegExp(`${call}\\("hn_cookies"`));
      assert.match(src, new RegExp(`${call}\\("hn_username"`));
    }
  });
});

describe("requireSession", () => {
  it("returns the session when present", () => {
    const session = new SecureSession({ user: "u" });
    assert.equal(requireSession(session), session);
  });

  it("throws a typed NOT_LOGGED_IN error when there is none", () => {
    for (const missing of [null, undefined]) {
      try {
        requireSession(missing);
        assert.fail("expected a throw");
      } catch (error) {
        assert.ok(isAuthError(error));
        assert.equal(error.code, "NOT_LOGGED_IN");
      }
    }
  });
});

describe("describeHNWriteError", () => {
  const options = {
    failureMessage: "Failed to do it.",
    karmaMessage: "More karma needed.",
  };

  it("NOT_LOGGED_IN logs out with a Session Expired message, unreported", () => {
    const result = describeHNWriteError(
      new HNAuthError("x", "NOT_LOGGED_IN"),
      options
    );
    assert.deepEqual(result, {
      title: "Session Expired",
      message: "Please log in again to continue",
      logout: true,
      report: false,
    });
  });

  it("a missing session (requireSession) takes the same logout path", () => {
    try {
      requireSession(null);
    } catch (error) {
      assert.equal(describeHNWriteError(error, options).logout, true);
    }
  });

  it("RATE_LIMITED is Slow Down: no logout, no report", () => {
    const result = describeHNWriteError(
      new HNAuthError("x", "RATE_LIMITED"),
      options
    );
    assert.equal(result.title, "Slow Down");
    assert.equal(result.logout, false);
    assert.equal(result.report, false);
  });

  it("INSUFFICIENT_KARMA uses the karma message, falling back to the failure message", () => {
    const error = new HNAuthError("x", "INSUFFICIENT_KARMA");
    assert.equal(
      describeHNWriteError(error, options).message,
      "More karma needed."
    );
    assert.equal(
      describeHNWriteError(error, { failureMessage: "Failed." }).message,
      "Failed."
    );
  });

  it("PARSE_ERROR is always reported (the scraper broke) and never logs out", () => {
    const result = describeHNWriteError(
      new HNAuthError("x", "PARSE_ERROR"),
      options
    );
    assert.equal(result.report, true);
    assert.equal(result.logout, false);
  });

  it("other HN errors get the generic message and are not reported", () => {
    const result = describeHNWriteError(
      new HNAuthError("x", "NETWORK_ERROR"),
      options
    );
    assert.equal(result.message, "Failed to do it.");
    assert.equal(result.report, false);
  });

  it("non-HN errors get the generic message and are reported", () => {
    const result = describeHNWriteError(new TypeError("boom"), options);
    assert.equal(result.title, "Error");
    assert.equal(result.message, "Failed to do it.");
    assert.equal(result.logout, false);
    assert.equal(result.report, true);
  });
});
