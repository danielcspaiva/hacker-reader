/**
 * HN Write API Client
 *
 * Provides authenticated write operations for Hacker News
 * (vote, comment, flag, delete)
 *
 * All operations require a valid SecureSession with HN cookies.
 */

import { HN_USER_AGENT, HN_WEB_URL } from "../constants";
import { HNAuthError } from "../errors";
import { SecureSession } from "../session";
import {
  parseCommentFormHmac,
  parseDeleteConfirmForm,
  parseDeleteLink,
  parseFlagLink,
  parseUnvoteLink,
  parseVoteLink,
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

/**
 * Base fetch function for HN requests with authentication
 */
async function fetchHN(
  path: string,
  session: SecureSession,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${HN_WEB_URL}${path}`;
  validateHTTPS(url);

  await hnRateLimiter.throttle();

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Cookie: session.dangerouslyGetRawCookiesForFetch(),
      "User-Agent": HN_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new HNAuthError(
      `HN request failed: ${response.status} ${response.statusText}`,
      "NETWORK_ERROR"
    );
  }

  return response;
}

/** Fetch an item page and return its HTML (source of vote/flag/delete/etc. links). */
async function fetchItemPage(
  itemId: number,
  session: SecureSession
): Promise<string> {
  const response = await fetchHN(`/item?id=${itemId}`, session);
  return response.text();
}

export async function vote(
  itemId: number,
  session: SecureSession
): Promise<void> {
  const html = await fetchItemPage(itemId, session);

  const voteLink = parseVoteLink(html, itemId);

  await fetchHN(`/${voteLink}`, session);
}

export async function unvote(
  itemId: number,
  session: SecureSession
): Promise<void> {
  const html = await fetchItemPage(itemId, session);

  const unvoteLink = parseUnvoteLink(html, itemId);

  await fetchHN(`/${unvoteLink}`, session);
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

/**
 * The text of HN's error message in a comment response, or "" when there is
 * none. HN reports errors either as a bare page (no table, form or textarea:
 * "Bad login.", "You're posting too fast...") or as an orange `<font>` message
 * on the re-rendered comment form. Words elsewhere on a normal page ("blank" in
 * `target="_blank"`, "slow down" in a comment) are not errors.
 */
function commentErrorText(html: string): string {
  if (!/<(table|form|textarea)\b/i.test(html)) {
    return html.replace(/<[^>]*>/g, " ").toLowerCase();
  }
  const messages = [
    ...html.matchAll(/<font color="#ff6600">([^<]*)<\/font>/gi),
  ];
  return messages
    .map((match) => match[1].trim())
    .filter((message) => message !== "*")
    .join(" ")
    .toLowerCase();
}

function checkForCommentErrors(responseHtml: string): void {
  const errorText = commentErrorText(responseHtml);

  if (
    errorText.includes("bad login") ||
    errorText.includes("unknown or expired link")
  ) {
    throw new HNAuthError(
      "Session expired - please log in again",
      "NOT_LOGGED_IN"
    );
  }
  if (
    errorText.includes("submitting too fast") ||
    errorText.includes("slow down")
  ) {
    throw new HNAuthError(
      "You are posting too fast. Please wait.",
      "RATE_LIMITED"
    );
  }
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
    throw new HNAuthError("Comment cannot be blank", "PARSE_ERROR");
  }

  const hasTextareaError = responseHtml.match(
    /<font color="#ff6600">\s*\*\s*<\/font>\s*<textarea name="text"/i
  );

  if (hasTextareaError) {
    const errorMatch = responseHtml.match(
      /<font color="#ff6600">\s*([^<]+)\s*<\/font>/i
    );
    const errorMessage = errorMatch ? errorMatch[1].trim() : null;

    if (errorMessage && errorMessage !== "*") {
      throw new HNAuthError(
        `HN rejected comment: ${errorMessage}`,
        "PARSE_ERROR"
      );
    }

    throw new HNAuthError(
      "HN rejected your comment. Possible reasons: comment too short, contains invalid characters, or account restrictions. Please try posting directly on news.ycombinator.com to see the specific error.",
      "PARSE_ERROR"
    );
  }
}

export async function comment(
  parentId: number,
  text: string,
  session: SecureSession
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

  const response = await fetchHN("/comment", session, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  const responseHtml = await response.text();
  checkForCommentErrors(responseHtml);

  // HN doesn't return the new id; scrape item?id=N links and take the
  // highest that isn't the parent. Null means the caller should refetch.
  return newestItemIdInHtml(responseHtml, parentId);
}

/**
 * Flag an item as inappropriate
 * Note: Flagging requires sufficient karma on Hacker News.
 * Users without enough karma will receive an INSUFFICIENT_KARMA error.
 */
export async function flag(
  itemId: number,
  session: SecureSession
): Promise<void> {
  const html = await fetchItemPage(itemId, session);

  const flagLink = parseFlagLink(html, itemId);

  await fetchHN(`/${flagLink}`, session);
}

/**
 * Delete a comment or story
 * Note: You can only delete your own items, and typically within
 * a time window after posting (HN enforces this).
 */
export async function deleteComment(
  itemId: number,
  session: SecureSession
): Promise<void> {
  const html = await fetchItemPage(itemId, session);

  const deleteLink = parseDeleteLink(html, itemId);

  const confirmPage = await fetchHN(`/${deleteLink}`, session);
  const confirmHtml = await confirmPage.text();

  const { hmac, goto } = parseDeleteConfirmForm(confirmHtml, itemId);

  const formData = new URLSearchParams({
    id: itemId.toString(),
    goto: goto,
    hmac: hmac,
    d: "Yes",
  });

  await fetchHN("/xdelete", session, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });
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

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": HN_USER_AGENT,
    },
    body: formData.toString(),
    // Redirects are followed by default; expo/fetch (the SDK 56 default) omits
    // the `redirect` option from its RequestInit type.
  });

  const html = await response.text();
  const lowerHtml = html.toLowerCase();

  if (
    lowerHtml.includes("bad login") ||
    lowerHtml.includes("unknown or expired")
  ) {
    throw new HNAuthError(
      "Invalid username or password",
      "INVALID_CREDENTIALS"
    );
  }

  if (
    lowerHtml.includes("banned") ||
    lowerHtml.includes("account is not active")
  ) {
    throw new HNAuthError("Account is banned or inactive", "BANNED");
  }

  if (
    lowerHtml.includes("too many") ||
    lowerHtml.includes("slow down") ||
    lowerHtml.includes("rate limit")
  ) {
    throw new HNAuthError(
      "Too many login attempts. Please wait and try again.",
      "RATE_LIMITED"
    );
  }

  if (response.url.includes("/login")) {
    throw new HNAuthError(
      "Login failed - please check your credentials",
      "INVALID_CREDENTIALS"
    );
  }
}
