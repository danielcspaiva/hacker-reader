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
  checkForCommentErrors,
  checkForLoginErrors,
} from "./hn-error-detector";
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
import { HN_WRITE_BASE_URL } from "../constants";
import { SecureSession } from "../auth/session";

const isDebugLoggingEnabled =
  (typeof __DEV__ !== "undefined" && __DEV__) ||
  process.env.NODE_ENV !== "production";

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
  const url = `${HN_WRITE_BASE_URL}${path}`;
  validateHTTPS(url);

  // Apply rate limiting
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
  // Step 1: Fetch item page to get auth token
  const itemPage = await fetchHN(`/item?id=${itemId}`, session);
  const html = await itemPage.text();

  // Step 2: Parse vote link
  const voteLink = parseVoteLink(html, itemId);

  // Step 3: Follow vote link
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
  // Step 1: Fetch parent item page to get HMAC
  const itemPage = await fetchHN(`/item?id=${parentId}`, session);
  const html = await itemPage.text();

  const hmac = parseCommentFormHmac(html);

  // Step 2: POST comment
  // HN requires 'goto' parameter for redirect after successful comment
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

  // Read the response HTML immediately (before it's consumed)
  const initialResponseHtml = await response.text();

  // Check if HN is asking for comment confirmation
  // URL pattern: https://news.ycombinator.com/x?fnid=...&fnop=commconfirm
  const needsConfirmation =
    response.url.includes("fnop=commconfirm") ||
    response.url.includes("fnop=comment-confirm");

  if (needsConfirmation) {
    // The response we already have IS the confirmation page
    // (fetch auto-followed the redirect and gave us the final page)
    const confirmHtml = initialResponseHtml;

    // Check the confirmation response for errors
    const confirmLowerHtml = confirmHtml.toLowerCase();

    await checkForCommentErrors(confirmHtml, confirmLowerHtml);

    // Try to extract the new comment ID from the confirmation response
    const confirmCommentIdMatch = confirmHtml.match(/item\?id=(\d+)/g);
    let confirmedCommentId: number | null = null;

    if (confirmCommentIdMatch && confirmCommentIdMatch.length > 0) {
      const ids = confirmCommentIdMatch
        .map((match) => {
          const id = match.match(/id=(\d+)/)?.[1];
          return id ? parseInt(id, 10) : null;
        })
        .filter((id): id is number => id !== null && id !== parentId);

      if (ids.length > 0) {
        confirmedCommentId = Math.max(...ids);
      }
    }

    return confirmedCommentId;
  }

  // Step 3: Verify the comment was accepted (no confirmation needed)
  // Use the HTML we already read from the response
  const lowerHtml = initialResponseHtml.toLowerCase();

  // Check for errors using helper function
  await checkForCommentErrors(initialResponseHtml, lowerHtml);

  // Success if we get here - HN redirected to item page without errors

  // Try to extract the new comment ID from the response HTML
  // HN includes links like <a href="item?id=45876842">
  const commentIdMatch = initialResponseHtml.match(/item\?id=(\d+)/g);
  let newCommentId: number | null = null;

  if (commentIdMatch && commentIdMatch.length > 0) {
    // Find IDs in the HTML, exclude the parent ID
    const ids = commentIdMatch
      .map((match) => {
        const id = match.match(/id=(\d+)/)?.[1];
        return id ? parseInt(id, 10) : null;
      })
      .filter((id): id is number => id !== null && id !== parentId);

    // The new comment ID is likely the highest ID (most recent)
    if (ids.length > 0) {
      newCommentId = Math.max(...ids);
    }
  }

  return newCommentId;
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
  // Step 1: Fetch item page to get flag link
  const itemPage = await fetchHN(`/item?id=${itemId}`, session);
  const html = await itemPage.text();

  // Step 2: Parse flag link (throws if insufficient karma)
  const flagLink = parseFlagLink(html, itemId);

  // Step 3: Follow flag link
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
  // Step 1: Fetch item page to get delete link
  const itemPage = await fetchHN(`/item?id=${itemId}`, session);
  const html = await itemPage.text();

  // Step 2: Parse delete link
  const deleteLink = parseDeleteLink(html, itemId);

  // Step 3: Follow delete-confirm link to get confirmation form
  const confirmPage = await fetchHN(`/${deleteLink}`, session);
  const confirmHtml = await confirmPage.text();

  // Step 4: Parse the confirmation form HMAC
  // The form has: <input type="hidden" name="hmac" value="...">
  const hmacMatch = confirmHtml.match(
    /<input[^>]*name="hmac"[^>]*value="([^"]+)"/i
  );
  if (!hmacMatch) {
    throw new HNAuthError("Delete confirmation HMAC not found", "PARSE_ERROR");
  }
  const hmac = hmacMatch[1];

  // Step 5: Parse the goto parameter
  const gotoMatch = confirmHtml.match(
    /<input[^>]*name="goto"[^>]*value="([^"]+)"/i
  );
  const goto = gotoMatch ? gotoMatch[1] : `item?id=${itemId}`;

  // Step 6: Submit the confirmation form
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
  const url = `${HN_WRITE_BASE_URL}/login`;
  validateHTTPS(url);

  // Prepare form data (matches HN's login form)
  const formData = new URLSearchParams({
    acct: username,
    pw: password,
  });

  // POST to login endpoint
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "HN-Client/1.0 (Mobile)",
    },
    body: formData.toString(),
    redirect: "follow", // Follow redirects to get final response
  });

  // Get response HTML to check for errors
  const html = await response.text();
  const lowerHtml = html.toLowerCase();

  // Check for login errors in the response
  checkForLoginErrors(lowerHtml, response.url);
}
