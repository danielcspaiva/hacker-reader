/**
 * HN Write API Client
 *
 * Provides authenticated write operations for Hacker News
 * (vote, comment, favorite, etc.)
 *
 * All operations require a valid SecureSession with HN cookies.
 */

import { HNAuthError } from '../auth/errors';
import {
    parseCommentFormHmac,
    parseFavoriteLink,
    parseUnfavoriteLink,
    parseUnvoteLink,
    parseVoteLink,
} from '../auth/parsers';
import { hnRateLimiter } from '../auth/rate-limiter';
import { SecureSession } from '../auth/session';

const HN_BASE_URL = 'https://news.ycombinator.com';

/**
 * Validate that a URL uses HTTPS
 */
function validateHTTPS(url: string): void {
  if (!url.startsWith('https://')) {
    throw new Error('HTTPS required for all HN requests');
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

  // Apply rate limiting
  await hnRateLimiter.throttle();

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Cookie': session.dangerouslyGetRawCookiesForFetch(),
      'User-Agent': 'HN-Client/1.0 (Mobile)',
    },
  });

  if (!response.ok) {
    throw new HNAuthError(
      `HN request failed: ${response.status} ${response.statusText}`,
      'NETWORK_ERROR'
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
 * @throws HNAuthError if operation fails
 */
export async function comment(
  parentId: number,
  text: string,
  session: SecureSession
): Promise<void> {
  console.log('[HN Write API] Starting comment post:', {
    parentId,
    textLength: text.length,
    hasSession: session.hasValidSession(),
  });

  // Step 1: Fetch parent item page to get HMAC
  const itemPage = await fetchHN(`/item?id=${parentId}`, session);
  const html = await itemPage.text();
  const hmac = parseCommentFormHmac(html);
  
  console.log('[HN Write API] Got HMAC:', hmac.slice(0, 10) + '...');

  // Step 2: POST comment
  // HN requires 'goto' parameter for redirect after successful comment
  const formData = new URLSearchParams({
    parent: parentId.toString(),
    goto: `item?id=${parentId}`,
    hmac: hmac,
    text: text,
  });

  console.log('[HN Write API] Posting comment with form data:', {
    parent: parentId,
    goto: `item?id=${parentId}`,
    hmacLength: hmac.length,
    textLength: text.length,
  });

  const response = await fetchHN('/comment', session, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  console.log('[HN Write API] Comment response:', {
    status: response.status,
    url: response.url,
    redirected: response.redirected,
  });

  // Step 3: Verify the comment was accepted
  const responseHtml = await response.text();
  const lowerHtml = responseHtml.toLowerCase();

  // Check for common error messages
  if (lowerHtml.includes('unknown or expired') || lowerHtml.includes('bad login')) {
    throw new HNAuthError('Session expired - please log in again', 'NOT_LOGGED_IN');
  }
  if (lowerHtml.includes('submitting too fast') || lowerHtml.includes('slow down')) {
    throw new HNAuthError('You are posting too fast. Please wait.', 'RATE_LIMITED');
  }
  if (lowerHtml.includes('insufficient karma') || lowerHtml.includes("can't comment")) {
    throw new HNAuthError('Insufficient karma to comment', 'INSUFFICIENT_KARMA');
  }
  if (lowerHtml.includes('blank') || lowerHtml.includes('empty comment')) {
    throw new HNAuthError('Comment cannot be blank', 'PARSE_ERROR');
  }

  // Check for validation errors (HN shows * in orange next to invalid fields)
  // Look for <textarea> with a preceding error indicator
  const hasTextareaError = responseHtml.match(/<font color="#ff6600">\s*\*\s*<\/font>\s*<textarea name="text"/i);
  
  if (hasTextareaError) {
    console.error('[HN Write API] Validation error detected - HN rejected the comment');
    
    // Try to extract any additional error message
    const errorMatch = responseHtml.match(/<font color="#ff6600">\s*([^<]+)\s*<\/font>/i);
    const errorMessage = errorMatch ? errorMatch[1].trim() : null;
    
    if (errorMessage && errorMessage !== '*') {
      console.error('[HN Write API] Error message from HN:', errorMessage);
      throw new HNAuthError(`HN rejected comment: ${errorMessage}`, 'PARSE_ERROR');
    }
    
    // Generic validation error
    console.error('[HN Write API] Response HTML snippet:', responseHtml.slice(0, 1000));
    throw new HNAuthError(
      'HN rejected your comment. Possible reasons: comment too short, contains invalid characters, or account restrictions. Please try posting directly on news.ycombinator.com to see the specific error.',
      'PARSE_ERROR'
    );
  }

  // Success if we get here - HN redirected to item page without errors
  console.log('[HN Write API] Comment posted successfully');
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
