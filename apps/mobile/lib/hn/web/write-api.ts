/**
 * HN Write API Client
 *
 * Provides authenticated write operations for Hacker News
 * (vote, comment, flag, delete)
 *
 * All operations require a valid SecureSession with HN cookies.
 */

import { HN_USER_AGENT, HN_WEB_URL } from "../constants";
import { HNAuthError, isAuthError } from "../errors";
import { fetchWithTimeout } from "../fetch-timeout";
import { getItem } from "../read/firebase";
import { SecureSession } from "../session";
import {
  assertNoHNMessage,
  classifyHNMessage,
  findOwnCommentId,
  hnMessageText,
  orangeMessages,
  parseCommentFormHmac,
  parseDeleteConfirmForm,
  parseDeleteLink,
  parseFlagState,
  parseVoteLink,
  parseVoteState,
} from "./parsers";
import { hnRateLimiter } from "./rate-limiter";

/**
 * Validate that a URL uses HTTPS
 */
function validateHTTPS(url: string): void {
  if (!url.startsWith("https://")) {
    throw new Error("HTTPS required for all HN requests");
  }
}

function networkError(error: unknown): HNAuthError {
  const detail = error instanceof Error ? error.message : String(error);
  return new HNAuthError(
    `Could not reach Hacker News: ${detail}`,
    "NETWORK_ERROR"
  );
}

/**
 * Base fetch function for HN requests with authentication. Every failure is a
 * typed HNAuthError: a dropped connection or the 15s timeout is NETWORK_ERROR,
 * HTTP 429 or HN's "not able to serve your requests this quickly" is
 * RATE_LIMITED, any other non-2xx is NETWORK_ERROR.
 *
 * HN answers a successful write with a 302 to `goto`; fetch follows it, so a
 * 2xx here is the landing page (or an empty body), and `response.url` is where
 * it landed.
 */
async function fetchHN(
  path: string,
  session: SecureSession,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${HN_WEB_URL}${path}`;
  validateHTTPS(url);

  await hnRateLimiter.throttle();

  let response: Response;
  try {
    response = await fetchWithTimeout(url, {
      ...options,
      headers: {
        ...options.headers,
        Cookie: session.dangerouslyGetRawCookiesForFetch(),
        "User-Agent": HN_USER_AGENT,
        // A stale cached item page would misreport vote/flag state.
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    throw networkError(error);
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new HNAuthError(
        "Rate limited by Hacker News - please wait",
        "RATE_LIMITED"
      );
    }
    const known = classifyHNMessage(
      hnMessageText(await response.text().catch(() => ""))
    );
    throw (
      known ??
      new HNAuthError(
        `HN request failed: ${response.status} ${response.statusText}`,
        "NETWORK_ERROR"
      )
    );
  }

  return response;
}

/**
 * Fetch an item page and return its HTML (source of vote/flag/delete/etc.
 * links). A message page instead (no such item, throttled) throws its typed
 * error.
 */
async function fetchItemPage(
  itemId: number,
  session: SecureSession
): Promise<string> {
  const response = await fetchHN(`/item?id=${itemId}`, session);
  const html = await response.text();
  assertNoHNMessage(html);
  return html;
}

/**
 * Follow an action link (vote, unvote, flag) found on the item page.
 *
 * `pick` reads the fresh page and returns the link to follow, or null when HN
 * already holds the requested state (nothing to do). The link's auth token can
 * go stale between the page and the request ("unknown or expired link"); the
 * page is then re-read once. Links are GETs that only set a state, so repeating
 * one is safe.
 */
async function followItemLink(
  itemId: number,
  session: SecureSession,
  pick: (html: string) => string | null
): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    const html = await fetchItemPage(itemId, session);
    const link = pick(html);
    if (!link) return;

    try {
      const response = await fetchHN(`/${link}`, session);
      assertNoHNMessage(await response.text());
      return;
    } catch (error) {
      const stale = isAuthError(error) && error.code === "EXPIRED_LINK";
      if (!stale || attempt > 0) throw error;
    }
  }
}

/**
 * Upvote an item. Reconciles with HN: if the item page shows the vote is
 * already cast (unvote link, or hidden up arrow), resolves without a request.
 */
export async function vote(
  itemId: number,
  session: SecureSession
): Promise<void> {
  await followItemLink(itemId, session, (html) => {
    const state = parseVoteState(html, itemId);
    if (state.voted) return null;
    return state.upLink ?? parseVoteLink(html, itemId);
  });
}

/**
 * Remove a vote. Reconciles with HN: if the item is not voted on, resolves
 * without a request; if it is voted but HN no longer offers an unvote link
 * (window passed), throws CANNOT_VOTE.
 */
export async function unvote(
  itemId: number,
  session: SecureSession
): Promise<void> {
  await followItemLink(itemId, session, (html) => {
    const state = parseVoteState(html, itemId);
    if (!state.voted) return null;
    if (!state.unLink) {
      throw new HNAuthError(
        `Unvote is no longer available for item ${itemId}`,
        "CANNOT_VOTE"
      );
    }
    return state.unLink;
  });
}

function newestItemIdInHtml(html: string, excludeId: number): number | null {
  const matches = html.match(/item\?id=(\d+)/g);
  if (!matches) return null;

  const ids = matches
    .map((match) => {
      const id = match.match(/id=(\d+)/)?.[1];
      return id ? parseInt(id, 10) : null;
    })
    .filter((id): id is number => id !== null && id !== excludeId);

  return ids.length > 0 ? Math.max(...ids) : null;
}

function checkForCommentErrors(responseHtml: string): void {
  const message = hnMessageText(responseHtml);
  const known = classifyHNMessage(message);
  if (known) throw known;

  const errorText = message.toLowerCase();
  if (
    errorText.includes("insufficient karma") ||
    errorText.includes("can't comment")
  ) {
    throw new HNAuthError(
      "Insufficient karma to comment",
      "INSUFFICIENT_KARMA"
    );
  }
  if (errorText.includes("blank") || errorText.includes("empty comment")) {
    throw new HNAuthError("Comment cannot be blank", "REJECTED");
  }

  // HN re-renders the form with an orange message when it refuses a comment
  // (too long, duplicate, ...). Unrecognised, it still means "not posted".
  const [orange] = orangeMessages(responseHtml);
  if (orange) {
    throw new HNAuthError(`HN rejected comment: ${orange}`, "REJECTED");
  }

  const hasTextareaError =
    /<font\s[^>]*#ff6600[^>]*>\s*\*\s*<\/font>\s*<textarea\b/i.test(
      responseHtml
    );
  if (hasTextareaError) {
    throw new HNAuthError(
      "HN rejected your comment. Possible reasons: comment too short, contains invalid characters, or account restrictions. Please try posting directly on news.ycombinator.com to see the specific error.",
      "REJECTED"
    );
  }
}

/**
 * Post a comment (or reply) and return the new comment's id, or null when it
 * cannot be told (the caller refetches).
 *
 * Success is HN's redirect to the thread page. Pass `username` so the id is
 * the newest comment by that user on the landing page; without it the newest
 * `item?id=` link is used, which can be someone else's comment. Never retried:
 * a POST that timed out may still have posted, so that outcome is
 * UNCONFIRMED and the caller must check the thread rather than resubmit.
 */
export async function comment(
  parentId: number,
  text: string,
  session: SecureSession,
  username?: string | null
): Promise<number | null> {
  const html = await fetchItemPage(parentId, session);

  const hmac = parseCommentFormHmac(html);

  // HN requires `goto` for the post-comment redirect.
  const formData = new URLSearchParams({
    parent: parentId.toString(),
    goto: `item?id=${parentId}`,
    hmac: hmac,
    text: text,
  });

  let response: Response;
  try {
    response = await fetchHN("/comment", session, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });
  } catch (error) {
    if (isAuthError(error) && error.code === "NETWORK_ERROR") {
      throw new HNAuthError("Your comment may have been posted", "UNCONFIRMED");
    }
    throw error;
  }

  const responseHtml = await response.text();
  checkForCommentErrors(responseHtml);

  // HN doesn't return the new id: read it off the page it redirects to. Null
  // means the caller should refetch.
  return username
    ? findOwnCommentId(responseHtml, username, parentId)
    : newestItemIdInHtml(responseHtml, parentId);
}

/**
 * Flag an item as inappropriate. Reconciles with HN: if the page only offers
 * "unflag" the item is already flagged and nothing is sent (following that
 * link would undo the flag).
 * Note: Flagging requires sufficient karma on Hacker News.
 * Users without enough karma will receive an INSUFFICIENT_KARMA error.
 */
export async function flag(
  itemId: number,
  session: SecureSession
): Promise<void> {
  await followItemLink(itemId, session, (html) => {
    const { flagged, flagLink } = parseFlagState(html, itemId);
    return flagged ? null : flagLink;
  });
}

/** True when Firebase says the item is deleted or gone. False if unknown. */
async function isItemGone(itemId: number): Promise<boolean> {
  try {
    const item = await getItem(itemId);
    return item === null || item.deleted === true;
  } catch {
    return false;
  }
}

/**
 * Delete a comment or story. Resolves without a request when the item is
 * already deleted.
 * Note: You can only delete your own items, and typically within
 * a time window after posting (HN enforces this).
 */
export async function deleteComment(
  itemId: number,
  session: SecureSession
): Promise<void> {
  const html = await fetchItemPage(itemId, session);

  let deleteLink: string;
  try {
    deleteLink = parseDeleteLink(html, itemId);
  } catch (error) {
    if (
      isAuthError(error) &&
      error.code === "CANNOT_DELETE" &&
      (await isItemGone(itemId))
    ) {
      return;
    }
    throw error;
  }

  const confirmPage = await fetchHN(`/${deleteLink}`, session);
  const confirmHtml = await confirmPage.text();
  assertNoHNMessage(confirmHtml);

  const { hmac, goto } = parseDeleteConfirmForm(confirmHtml, itemId);

  const formData = new URLSearchParams({
    id: itemId.toString(),
    goto: goto,
    hmac: hmac,
    d: "Yes",
  });

  const response = await fetchHN("/xdelete", session, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });
  assertNoHNMessage(await response.text());
}

/**
 * Login to Hacker News with username and password
 * This function performs the login POST request to HN.
 * Cookies are managed by the native cookie manager and should be
 * extracted separately using @react-native-cookies/cookies.
 */
export async function login(username: string, password: string): Promise<void> {
  const url = `${HN_WEB_URL}/login`;
  validateHTTPS(url);

  const formData = new URLSearchParams({
    acct: username,
    pw: password,
  });

  let response: Response;
  try {
    response = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": HN_USER_AGENT,
      },
      body: formData.toString(),
      // Redirects are followed by default; expo/fetch (the SDK 56 default) omits
      // the `redirect` option from its RequestInit type.
    });
  } catch (error) {
    throw networkError(error);
  }

  if (response.status >= 500) {
    throw new HNAuthError(
      `HN request failed: ${response.status} ${response.statusText}`,
      "NETWORK_ERROR"
    );
  }

  // Only HN's own message counts: a successful login lands on the front page,
  // whose story titles can contain "banned" or "too many".
  const lowerMessage = hnMessageText(await response.text()).toLowerCase();

  if (
    lowerMessage.includes("bad login") ||
    lowerMessage.includes("unknown or expired")
  ) {
    throw new HNAuthError(
      "Invalid username or password",
      "INVALID_CREDENTIALS"
    );
  }

  if (
    lowerMessage.includes("banned") ||
    lowerMessage.includes("account is not active")
  ) {
    throw new HNAuthError("Account is banned or inactive", "BANNED");
  }

  if (
    lowerMessage.includes("too many") ||
    lowerMessage.includes("slow down") ||
    lowerMessage.includes("rate limit")
  ) {
    throw new HNAuthError(
      "Too many login attempts. Please wait and try again.",
      "RATE_LIMITED"
    );
  }

  const captcha = classifyHNMessage(lowerMessage);
  if (captcha?.code === "CAPTCHA_REQUIRED") {
    throw new HNAuthError(
      "Hacker News wants to verify you are human. Try again later, or sign in at news.ycombinator.com first.",
      "CAPTCHA_REQUIRED"
    );
  }

  if (response.url.includes("/login")) {
    throw new HNAuthError(
      "Login failed - please check your credentials",
      "INVALID_CREDENTIALS"
    );
  }
}
