/**
 * HN Write API Client
 *
 * Provides authenticated write operations for Hacker News
 * (vote, comment, favorite, etc.)
 *
 * All operations require a valid SecureSession with HN cookies.
 */

import { HNAuthError } from "../auth/errors";
import {
  parseCommentFormHmac,
  parseDeleteLink,
  parseFavoriteLink,
  parseFlagLink,
  parseUnfavoriteLink,
  parseUnvoteLink,
  parseVoteLink,
} from "../auth/parsers";
import { hnRateLimiter } from "../auth/rate-limiter";
import { SecureSession } from "../auth/session";

const HN_BASE_URL = "https://news.ycombinator.com";

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
  const url = `${HN_BASE_URL}${path}`;
  validateHTTPS(url);

  await hnRateLimiter.throttle();

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Cookie: session.dangerouslyGetRawCookiesForFetch(),
      "User-Agent": "HN-Client/1.0 (Mobile)",
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

/**
 * Upvote an item (story or comment)
 *
 * @param itemId - ID of the item to vote on
 * @param session - Authenticated session
 * @throws HNAuthError if operation fails
 */
export async function vote(
  itemId: number,
  session: SecureSession
): Promise<void> {
  const itemPage = await fetchHN(`/item?id=${itemId}`, session);
  const html = await itemPage.text();

  const voteLink = parseVoteLink(html, itemId);

  await fetchHN(`/${voteLink}`, session);
}

/**
 * Remove upvote from an item
 *
 * @param itemId - ID of the item to unvote
 * @param session - Authenticated session
 * @throws HNAuthError if operation fails
 */
export async function unvote(
  itemId: number,
  session: SecureSession
): Promise<void> {
  const itemPage = await fetchHN(`/item?id=${itemId}`, session);
  const html = await itemPage.text();

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

async function checkForCommentErrors(responseHtml: string): Promise<void> {
  const lowerHtml = responseHtml.toLowerCase();

  // Confirmation pages mention "unknown or expired" as documentation;
  // only "unknown or expired link" is the real error.

  if (lowerHtml.includes("bad login")) {
    throw new HNAuthError(
      "Session expired - please log in again",
      "NOT_LOGGED_IN"
    );
  }

  if (lowerHtml.includes("unknown or expired link")) {
    throw new HNAuthError(
      "Session expired - please log in again",
      "NOT_LOGGED_IN"
    );
  }
  if (
    lowerHtml.includes("submitting too fast") ||
    lowerHtml.includes("slow down")
  ) {
    throw new HNAuthError(
      "You are posting too fast. Please wait.",
      "RATE_LIMITED"
    );
  }
  if (
    lowerHtml.includes("insufficient karma") ||
    lowerHtml.includes("can't comment")
  ) {
    throw new HNAuthError(
      "Insufficient karma to comment",
      "INSUFFICIENT_KARMA"
    );
  }
  if (lowerHtml.includes("blank") || lowerHtml.includes("empty comment")) {
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

/**
 * Post a comment on an item
 *
 * @param parentId - ID of the parent item (story or comment)
 * @param text - Comment text (supports HN markdown)
 * @param session - Authenticated session
 * @returns The ID of the newly created comment (if found in response)
 * @throws HNAuthError if operation fails
 */
export async function comment(
  parentId: number,
  text: string,
  session: SecureSession
): Promise<number | null> {
  const itemPage = await fetchHN(`/item?id=${parentId}`, session);
  const html = await itemPage.text();

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
  await checkForCommentErrors(responseHtml);

  // HN doesn't return the new id; scrape item?id=N links and take the
  // highest that isn't the parent. Null means the caller should refetch.
  return newestItemIdInHtml(responseHtml, parentId);
}

/**
 * Favorite an item
 *
 * @param itemId - ID of the item to favorite
 * @param session - Authenticated session
 * @throws HNAuthError if operation fails
 */
export async function favorite(
  itemId: number,
  session: SecureSession
): Promise<void> {
  const itemPage = await fetchHN(`/item?id=${itemId}`, session);
  const html = await itemPage.text();
  const favLink = parseFavoriteLink(html, itemId);
  await fetchHN(`/${favLink}`, session);
}

/**
 * Unfavorite an item
 *
 * @param itemId - ID of the item to unfavorite
 * @param session - Authenticated session
 * @throws HNAuthError if operation fails
 */
export async function unfavorite(
  itemId: number,
  session: SecureSession
): Promise<void> {
  const itemPage = await fetchHN(`/item?id=${itemId}`, session);
  const html = await itemPage.text();
  const unfavLink = parseUnfavoriteLink(html, itemId);
  await fetchHN(`/${unfavLink}`, session);
}

/**
 * Flag an item as inappropriate
 *
 * Note: Flagging requires sufficient karma on Hacker News.
 * Users without enough karma will receive an INSUFFICIENT_KARMA error.
 *
 * @param itemId - ID of the item to flag
 * @param session - Authenticated session
 * @throws HNAuthError if operation fails or user lacks karma
 */
export async function flag(
  itemId: number,
  session: SecureSession
): Promise<void> {
  const itemPage = await fetchHN(`/item?id=${itemId}`, session);
  const html = await itemPage.text();

  const flagLink = parseFlagLink(html, itemId);

  await fetchHN(`/${flagLink}`, session);
}

/**
 * Delete a comment or story
 *
 * Note: You can only delete your own items, and typically within
 * a time window after posting (HN enforces this).
 *
 * @param itemId - ID of the item to delete
 * @param session - Authenticated session
 * @throws HNAuthError if operation fails
 */
export async function deleteComment(
  itemId: number,
  session: SecureSession
): Promise<void> {
  const itemPage = await fetchHN(`/item?id=${itemId}`, session);
  const html = await itemPage.text();

  const deleteLink = parseDeleteLink(html, itemId);

  const confirmPage = await fetchHN(`/${deleteLink}`, session);
  const confirmHtml = await confirmPage.text();

  // Confirmation form: <input type="hidden" name="hmac" value="...">
  const hmacMatch = confirmHtml.match(
    /<input[^>]*name="hmac"[^>]*value="([^"]+)"/i
  );
  if (!hmacMatch) {
    throw new HNAuthError("Delete confirmation HMAC not found", "PARSE_ERROR");
  }
  const hmac = hmacMatch[1];

  const gotoMatch = confirmHtml.match(
    /<input[^>]*name="goto"[^>]*value="([^"]+)"/i
  );
  const goto = gotoMatch ? gotoMatch[1] : `item?id=${itemId}`;

  const formData = new URLSearchParams({
    id: itemId.toString(),
    goto: goto,
    hmac: hmac,
    d: "Yes", // Confirm deletion
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
 *
 * This function performs the login POST request to HN.
 * Cookies are managed by the native cookie manager and should be
 * extracted separately using @react-native-cookies/cookies.
 *
 * @param username - HN username
 * @param password - HN password
 * @throws HNAuthError if login fails
 */
export async function login(username: string, password: string): Promise<void> {
  const url = `${HN_BASE_URL}/login`;
  validateHTTPS(url);

  const formData = new URLSearchParams({
    acct: username,
    pw: password,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "HN-Client/1.0 (Mobile)",
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
