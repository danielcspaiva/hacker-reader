/**
 * HTML parsing utilities for extracting auth tokens from HN pages
 *
 * HN's write operations require parsing HTML to extract auth tokens
 * (vote links, comment form HMACs, etc.)
 */

import { decodeEntities } from "../../html/entities";
import { HNAuthError } from "../errors";

/**
 * Decode a scraped attribute value. Handles `&apos;` (parsers only) plus numeric
 * entities via the shared decoder (see test/README.md, intentional changes).
 */
function decodeAttributeValue(value: string): string {
  return decodeEntities(value.replace(/&apos;/gi, "'"));
}

/**
 * Strip HTML tags and collapse whitespace to approximate visible text.
 */
function extractTextContent(html: string): string {
  return (
    html
      // Remove script and style contents entirely.
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      // Drop the remaining tags.
      .replace(/<[^>]+>/g, " ")
      // Decode a couple of common entities we rely on for keyword checks.
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&quot;/gi, '"')
      // Collapse whitespace for easier includes() checks.
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * A signed-in HN page always links to `logout?auth=...` in its header. Comment
 * text can say "login", so the word alone must not end the session.
 */
function isSignedOutPage(html: string): boolean {
  return (
    !/href=["']?logout\?/i.test(html) &&
    extractTextContent(html).toLowerCase().includes("login")
  );
}

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extract a single attribute from an HTML tag fragment.
 */
function getAttributeValue(
  fragment: string,
  attributeName: string
): string | null {
  const attributeRegex = new RegExp(
    `(?:^|\\s)${escapeForRegex(attributeName)}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i"
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

    const tagEnd = lowerHtml.indexOf(">", tagStart);
    if (tagEnd === -1) {
      return null;
    }

    const fragment = html.slice(tagStart, tagEnd + 1);
    const value = getAttributeValue(fragment, attributeName);

    if (value) {
      const lowerValue = value.toLowerCase();
      if (
        lowerValue === expectedValue ||
        lowerValue.startsWith(`${expectedValue}_`)
      ) {
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
  const fragment = findTagByAttribute(
    html,
    tagName,
    locatorAttribute,
    locatorValue
  );
  if (!fragment) {
    return null;
  }

  return getAttributeValue(fragment, targetAttribute);
}

function findVotePath(
  html: string,
  itemId: number,
  how: "up" | "un" | "fav" | "unfav"
): string | null {
  const pattern = new RegExp(
    `vote\\?[^"'<>\\s]*(?:id|for)=${itemId}[^"'<>\\s]*how=${how}[^"'<>\\s]*`,
    "i"
  );
  const match = pattern.exec(html);
  if (!match) {
    return null;
  }

  const rawPath = match[0];
  return decodeAttributeValue(rawPath);
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
  const rawVoteLink = extractAttributeFromTag(
    html,
    "a",
    "id",
    `up_${itemId}`,
    "href"
  );

  // Decode HTML entities from the extracted href attribute
  const voteLink = rawVoteLink ? decodeAttributeValue(rawVoteLink) : null;

  const fallbackVoteLink = voteLink ?? findVotePath(html, itemId, "up");
  if (!fallbackVoteLink) {
    // Smart error detection
    const text = extractTextContent(html).toLowerCase();

    if (isSignedOutPage(html)) {
      throw new HNAuthError(
        "Session expired - please log in again",
        "NOT_LOGGED_IN"
      );
    }
    if (text.includes("karma")) {
      throw new HNAuthError("Insufficient karma to vote", "INSUFFICIENT_KARMA");
    }
    if (text.includes("slow down") || text.includes("too fast")) {
      throw new HNAuthError("Rate limited - please wait", "RATE_LIMITED");
    }
    if (text.includes("captcha") || text.includes("verify")) {
      throw new HNAuthError(
        "CAPTCHA required - cannot proceed",
        "CAPTCHA_REQUIRED"
      );
    }

    throw new HNAuthError(
      `Vote link not found for item ${itemId} - HN HTML may have changed`,
      "PARSE_ERROR"
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
  const rawUnvoteLink = extractAttributeFromTag(
    html,
    "a",
    "id",
    `un_${itemId}`,
    "href"
  );

  // Decode HTML entities from the extracted href attribute
  const unvoteLink = rawUnvoteLink ? decodeAttributeValue(rawUnvoteLink) : null;

  const fallbackUnvoteLink = unvoteLink ?? findVotePath(html, itemId, "un");

  if (!fallbackUnvoteLink) {
    throw new HNAuthError(
      `Unvote link not found for item ${itemId}`,
      "PARSE_ERROR"
    );
  }

  return fallbackUnvoteLink;
}

/**
 * Parse comment form HMAC from an HN item page
 *
 * @param html - HTML content of the item page
 * @returns HMAC value from the comment form
 * @throws HNAuthError if parsing fails
 */
export function parseCommentFormHmac(html: string): string {
  const rawHmac = extractAttributeFromTag(
    html,
    "input",
    "name",
    "hmac",
    "value"
  );

  if (!rawHmac) {
    if (isSignedOutPage(html)) {
      throw new HNAuthError(
        "Session expired - please log in again",
        "NOT_LOGGED_IN"
      );
    }

    throw new HNAuthError("Comment form HMAC not found", "PARSE_ERROR");
  }

  // Decode HTML entities (just in case, though HMACs shouldn't have them)
  return decodeAttributeValue(rawHmac);
}

/**
 * Parse flag link from an HN item page
 *
 * Note: Flag links are only available to users with sufficient karma on HN.
 * If the link is not found, it likely means the user doesn't have permission.
 *
 * @param html - HTML content of the item page
 * @param itemId - ID of the item to flag
 * @returns Flag link path
 * @throws HNAuthError if parsing fails
 */
export function parseFlagLink(html: string, itemId: number): string {
  // Try to find flag link by id attribute
  const rawFlagLink = extractAttributeFromTag(
    html,
    "a",
    "id",
    `flag_${itemId}`,
    "href"
  );

  // Decode HTML entities from the extracted href attribute
  const flagLink = rawFlagLink ? decodeAttributeValue(rawFlagLink) : null;

  // Also try pattern matching for flag links
  const fallbackFlagLink =
    flagLink ??
    (() => {
      const pattern = new RegExp(
        `flag\\?[^"'<>\\s]*(?:id|for)=${itemId}[^"'<>\\s]*`,
        "i"
      );
      const match = pattern.exec(html);
      return match ? decodeAttributeValue(match[0]) : null;
    })();

  if (!fallbackFlagLink) {
    if (isSignedOutPage(html)) {
      throw new HNAuthError(
        "Session expired - please log in again",
        "NOT_LOGGED_IN"
      );
    }

    // Flag link not present usually means insufficient karma
    throw new HNAuthError(
      "Flag link not found - you may need more karma on Hacker News to flag content",
      "INSUFFICIENT_KARMA"
    );
  }

  return fallbackFlagLink;
}

/**
 * Parse delete link from an HN item page
 *
 * Note: Delete links are only available for your own comments/stories
 * and typically within a time window after posting.
 *
 * @param html - HTML content of the item page
 * @param itemId - ID of the item to delete
 * @returns Delete link path (e.g., "delete-confirm?id=123&goto=...")
 * @throws HNAuthError if parsing fails
 */
export function parseDeleteLink(html: string, itemId: number): string {
  // Pattern match for delete-confirm links
  // Example: delete-confirm?id=45877116&amp;goto=item%3Fid%3D45853261
  const pattern = new RegExp(
    `delete-confirm\\?[^"'<>\\s]*id=${itemId}[^"'<>\\s]*`,
    "i"
  );
  const match = pattern.exec(html);
  const deleteLink = match ? decodeAttributeValue(match[0]) : null;

  if (!deleteLink) {
    if (isSignedOutPage(html)) {
      throw new HNAuthError(
        "Session expired - please log in again",
        "NOT_LOGGED_IN"
      );
    }

    // Delete link not present means either:
    // - Not your comment
    // - Too old (outside deletion window)
    // - Already deleted
    throw new HNAuthError(
      "Delete link not found - this may not be your comment, or the deletion window has expired",
      "PARSE_ERROR"
    );
  }

  return deleteLink;
}

export interface DeleteConfirmForm {
  hmac: string;
  goto: string;
}

/**
 * Parse the delete confirmation page for the hidden `hmac` and `goto` inputs.
 *
 * `goto` falls back to the item page when the form omits it.
 *
 * @throws HNAuthError (PARSE_ERROR) if the hmac input is missing
 */
export function parseDeleteConfirmForm(
  confirmHtml: string,
  itemId: number
): DeleteConfirmForm {
  // Confirmation form: <input type="hidden" name="hmac" value="...">
  const hmacMatch = confirmHtml.match(
    /<input[^>]*name="hmac"[^>]*value="([^"]+)"/i
  );
  if (!hmacMatch) {
    throw new HNAuthError("Delete confirmation HMAC not found", "PARSE_ERROR");
  }

  const gotoMatch = confirmHtml.match(
    /<input[^>]*name="goto"[^>]*value="([^"]+)"/i
  );
  return {
    hmac: hmacMatch[1],
    goto: gotoMatch ? gotoMatch[1] : `item?id=${itemId}`,
  };
}
