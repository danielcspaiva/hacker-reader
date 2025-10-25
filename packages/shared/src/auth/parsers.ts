/**
 * HTML parsing utilities for extracting auth tokens from HN pages
 *
 * HN's write operations require parsing HTML to extract auth tokens
 * (vote links, comment form HMACs, etc.)
 */

import { HNAuthError } from './errors';

/**
 * Strip HTML tags and collapse whitespace to approximate visible text.
 */
function extractTextContent(html: string): string {
  return (
    html
      // Remove script and style contents entirely.
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      // Drop the remaining tags.
      .replace(/<[^>]+>/g, ' ')
      // Decode a couple of common entities we rely on for keyword checks.
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&quot;/gi, '"')
      // Collapse whitespace for easier includes() checks.
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract a single attribute from an HTML tag fragment.
 */
function getAttributeValue(fragment: string, attributeName: string): string | null {
  const attributeRegex = new RegExp(
    `(?:^|\\s)${escapeForRegex(attributeName)}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    'i'
  );

  const match = attributeRegex.exec(fragment);
  if (!match) {
    return null;
  }

  return match[1] ?? match[2] ?? match[3] ?? null;
}

/**
 * Locate an HTML tag by attribute (e.g., <a id="up_1" ...>) and return the tag fragment.
 */
function findTagByAttribute(
  html: string,
  tagName: string,
  attributeName: string,
  attributeValue: string
): string | null {
  const lowerHtml = html.toLowerCase();
  const searchTag = `<${tagName.toLowerCase()}`;
  const expectedValue = attributeValue.toLowerCase();
  let cursor = 0;

  while (cursor < lowerHtml.length) {
    const tagStart = lowerHtml.indexOf(searchTag, cursor);
    if (tagStart === -1) {
      return null;
    }

    const tagEnd = lowerHtml.indexOf('>', tagStart);
    if (tagEnd === -1) {
      return null;
    }

    const fragment = html.slice(tagStart, tagEnd + 1);
    const value = getAttributeValue(fragment, attributeName);

    if (value) {
      const lowerValue = value.toLowerCase();
      if (lowerValue === expectedValue || lowerValue.startsWith(`${expectedValue}_`)) {
        return fragment;
      }
    }

    cursor = tagEnd + 1;
  }

  return null;
}

/**
 * Extract attribute from a tag located by attribute.
 */
function extractAttributeFromTag(
  html: string,
  tagName: string,
  locatorAttribute: string,
  locatorValue: string,
  targetAttribute: string
): string | null {
  const fragment = findTagByAttribute(html, tagName, locatorAttribute, locatorValue);
  if (!fragment) {
    return null;
  }

  return getAttributeValue(fragment, targetAttribute);
}

function decodeHTMLEntities(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function findVotePath(html: string, itemId: number, how: 'up' | 'un' | 'fav' | 'unfav'): string | null {
  const pattern = new RegExp(
    `vote\\?[^"'<>\\s]*(?:id|for)=${itemId}[^"'<>\\s]*how=${how}[^"'<>\\s]*`,
    'i'
  );
  const match = pattern.exec(html);
  if (!match) {
    return null;
  }

  const rawPath = match[0];
  return decodeHTMLEntities(rawPath);
}

/**
 * Parse vote link from an HN item page
 *
 * @param html - HTML content of the item page
 * @param itemId - ID of the item to vote on
 * @returns Vote link path (e.g., "vote?id=123&how=up&auth=abc")
 * @throws HNAuthError with appropriate code if parsing fails
 */
export function parseVoteLink(html: string, itemId: number): string {
  const voteLink = extractAttributeFromTag(html, 'a', 'id', `up_${itemId}`, 'href');
  const fallbackVoteLink = voteLink ?? findVotePath(html, itemId, 'up');
  if (!fallbackVoteLink) {
    // Smart error detection
    const text = extractTextContent(html).toLowerCase();

    if (text.includes('login')) {
      throw new HNAuthError('Session expired - please log in again', 'NOT_LOGGED_IN');
    }
    if (text.includes('karma')) {
      throw new HNAuthError('Insufficient karma to vote', 'INSUFFICIENT_KARMA');
    }
    if (text.includes('slow down') || text.includes('too fast')) {
      throw new HNAuthError('Rate limited - please wait', 'RATE_LIMITED');
    }
    if (text.includes('captcha') || text.includes('verify')) {
      throw new HNAuthError('CAPTCHA required - cannot proceed', 'CAPTCHA_REQUIRED');
    }

    throw new HNAuthError(
      `Vote link not found for item ${itemId} - HN HTML may have changed`,
      'PARSE_ERROR'
    );
  }

  return fallbackVoteLink;
}

/**
 * Parse unvote link from an HN item page
 *
 * @param html - HTML content of the item page
 * @param itemId - ID of the item to unvote
 * @returns Unvote link path
 * @throws HNAuthError if parsing fails
 */
export function parseUnvoteLink(html: string, itemId: number): string {
  const unvoteLink =
    extractAttributeFromTag(html, 'a', 'id', `un_${itemId}`, 'href') ??
    findVotePath(html, itemId, 'un');

  if (!unvoteLink) {
    throw new HNAuthError(
      `Unvote link not found for item ${itemId}`,
      'PARSE_ERROR'
    );
  }

  return unvoteLink;
}

/**
 * Parse comment form HMAC from an HN item page
 *
 * @param html - HTML content of the item page
 * @returns HMAC value from the comment form
 * @throws HNAuthError if parsing fails
 */
export function parseCommentFormHmac(html: string): string {
  const hmac = extractAttributeFromTag(html, 'input', 'name', 'hmac', 'value');

  if (!hmac) {
    const text = extractTextContent(html).toLowerCase();

    if (text.includes('login')) {
      throw new HNAuthError('Session expired - please log in again', 'NOT_LOGGED_IN');
    }

    throw new HNAuthError('Comment form HMAC not found', 'PARSE_ERROR');
  }

  return hmac;
}

/**
 * Parse favorite link from an HN item page
 *
 * @param html - HTML content of the item page
 * @param itemId - ID of the item to favorite
 * @returns Favorite link path
 * @throws HNAuthError if parsing fails
 */
export function parseFavoriteLink(html: string, itemId: number): string {
  const favLink = extractAttributeFromTag(html, 'a', 'id', `fave_${itemId}`, 'href');

  if (!favLink) {
    throw new HNAuthError('Favorite link not found', 'PARSE_ERROR');
  }

  return favLink;
}

/**
 * Parse unfavorite link from an HN item page
 *
 * @param html - HTML content of the item page
 * @param itemId - ID of the item to unfavorite
 * @returns Unfavorite link path
 * @throws HNAuthError if parsing fails
 */
export function parseUnfavoriteLink(html: string, itemId: number): string {
  const unfavLink = extractAttributeFromTag(html, 'a', 'id', `unfave_${itemId}`, 'href');

  if (!unfavLink) {
    throw new HNAuthError('Unfavorite link not found', 'PARSE_ERROR');
  }

  return unfavLink;
}
