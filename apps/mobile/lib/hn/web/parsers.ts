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

const LOGOUT_LINK = /href=["']?logout\?/i;

/** A signed-in HN page always links to `logout?auth=...` in its header. */
function isSignedInPage(html: string): boolean {
  return LOGOUT_LINK.test(html);
}

/**
 * Comment text can say "login", so the word alone must not end the session:
 * a page is signed out only without the logout link. Besides the header's
 * "login" link, HN answers a write from a dead session with a bare
 * "You have to be logged in to vote." / "Please log in." page.
 */
function isSignedOutPage(html: string): boolean {
  if (isSignedInPage(html)) return false;
  const text = extractTextContent(html).toLowerCase();
  return (
    text.includes("login") ||
    text.includes("you have to be logged in") ||
    text.includes("please log in")
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

interface HNLink {
  /** Decoded path + query, without a leading slash: `vote?id=1&how=up&auth=x`. */
  path: string;
  params: URLSearchParams;
}

type HNLinkPage = "vote" | "flag" | "delete-confirm";

/**
 * Every `<page>?...` link in the HTML that targets `itemId` (as `id` or `for`),
 * whatever the quote style, attribute order or query-parameter order. The
 * item id is compared as a whole number, so `id=1` never matches `id=123`.
 */
function findLinks(html: string, page: HNLinkPage, itemId: number): HNLink[] {
  const pattern = new RegExp(
    `(?:^|[^\\w-])(?:https?:\\/\\/news\\.ycombinator\\.com)?\\/?(${page}\\?[^"'<>\\s]*)`,
    "gi"
  );
  const links: HNLink[] = [];
  for (const match of html.matchAll(pattern)) {
    const path = decodeAttributeValue(match[1]);
    const params = new URLSearchParams(path.slice(path.indexOf("?") + 1));
    if ((params.get("id") ?? params.get("for")) === String(itemId)) {
      links.push({ path, params });
    }
  }
  return links;
}

function findVotePath(
  html: string,
  itemId: number,
  how: "up" | "un"
): string | null {
  const link = findLinks(html, "vote", itemId).find(
    ({ params }) => params.get("how") === how
  );
  return link?.path ?? null;
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

export interface VoteState {
  /** HN already holds this user's vote (an unvote link, or a `nosee` up arrow). */
  voted: boolean;
  /** Path of the up-vote link, when the page offers one. */
  upLink: string | null;
  /** Path of the unvote link, when the page offers one. */
  unLink: string | null;
}

/**
 * Read the signed-in user's vote state for an item from its page.
 *
 * HN hides the up arrow (class `nosee`) once voted and shows an `un_ID`
 * "unvote" link instead; a voted item may lack the unvote link once its
 * window has passed. Items that cannot be voted on (own submissions, jobs)
 * have no arrow at all.
 *
 * @throws HNAuthError NOT_LOGGED_IN for a signed-out page, RATE_LIMITED for a
 *   throttled bare page, CANNOT_VOTE when the item has no vote arrow
 */
export function parseVoteState(html: string, itemId: number): VoteState {
  const rawUn =
    extractAttributeFromTag(html, "a", "id", `un_${itemId}`, "href") ??
    findVotePath(html, itemId, "un");
  const unLink = rawUn ? decodeAttributeValue(rawUn) : null;

  const upTag = findTagByAttribute(html, "a", "id", `up_${itemId}`);
  const rawUp =
    (upTag ? getAttributeValue(upTag, "href") : null) ??
    findVotePath(html, itemId, "up");
  const upLink = rawUp ? decodeAttributeValue(rawUp) : null;
  const hidden = /\bnosee\b/i.test(
    (upTag && getAttributeValue(upTag, "class")) ?? ""
  );

  if (unLink || hidden) {
    return { voted: true, upLink, unLink };
  }
  if (upLink) {
    return { voted: false, upLink, unLink: null };
  }

  if (isSignedOutPage(html)) {
    throw new HNAuthError(
      "Session expired - please log in again",
      "NOT_LOGGED_IN"
    );
  }
  if (!isSignedInPage(html)) {
    const text = extractTextContent(html).toLowerCase();
    if (text.includes("slow down") || text.includes("too fast")) {
      throw new HNAuthError("Rate limited - please wait", "RATE_LIMITED");
    }
  }
  throw new HNAuthError(`Item ${itemId} has no vote arrow`, "CANNOT_VOTE");
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

    // A signed-in page with no reply form: the item takes no replies (older
    // than HN's window, locked or dead). Not a markup break.
    if (isSignedInPage(html)) {
      throw new HNAuthError(
        "This item is not accepting comments",
        "CANNOT_COMMENT"
      );
    }

    throw new HNAuthError("Comment form HMAC not found", "PARSE_ERROR");
  }

  // Decode HTML entities (just in case, though HMACs shouldn't have them)
  return decodeAttributeValue(rawHmac);
}

export interface FlagState {
  /** HN already holds this user's flag (only an "unflag" link is offered). */
  flagged: boolean;
  /** Path of the flag link, when the page offers one. */
  flagLink: string | null;
}

/**
 * Read the flag state of an item from its page. HN flips the same link to
 * `flag?id=..&un=1` ("unflag") once flagged, so a `flag?id=` match alone is
 * not enough: following it would unflag.
 *
 * Flag links are only shown to users with sufficient karma; without one the
 * user gets INSUFFICIENT_KARMA.
 *
 * @throws HNAuthError NOT_LOGGED_IN for a signed-out page, INSUFFICIENT_KARMA
 *   when the page offers neither link
 */
export function parseFlagState(html: string, itemId: number): FlagState {
  const rawIdLink = extractAttributeFromTag(
    html,
    "a",
    "id",
    `flag_${itemId}`,
    "href"
  );
  const candidates = [
    ...(rawIdLink ? [decodeAttributeValue(rawIdLink)] : []),
    ...findLinks(html, "flag", itemId).map((link) => link.path),
  ];
  const isUnflag = (path: string) =>
    new URLSearchParams(path.slice(path.indexOf("?") + 1)).has("un");

  const flagLink = candidates.find((path) => !isUnflag(path)) ?? null;
  if (flagLink) return { flagged: false, flagLink };
  if (candidates.length > 0) return { flagged: true, flagLink: null };

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

/**
 * Parse flag link from an HN item page
 *
 * @param html - HTML content of the item page
 * @param itemId - ID of the item to flag
 * @returns Flag link path
 * @throws HNAuthError if the link is missing, or the item is already flagged
 */
export function parseFlagLink(html: string, itemId: number): string {
  const { flagLink } = parseFlagState(html, itemId);
  if (!flagLink) {
    throw new HNAuthError(`Item ${itemId} is already flagged`, "REJECTED");
  }
  return flagLink;
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
  // Example: delete-confirm?id=45877116&amp;goto=item%3Fid%3D45853261
  const deleteLink = findLinks(html, "delete-confirm", itemId)[0]?.path;

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
      "CANNOT_DELETE"
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
  // Confirmation form: <input type="hidden" name="hmac" value="...">, in any
  // attribute order and quote style.
  const hmac = extractAttributeFromTag(
    confirmHtml,
    "input",
    "name",
    "hmac",
    "value"
  );
  if (!hmac) {
    if (isSignedOutPage(confirmHtml)) {
      throw new HNAuthError(
        "Session expired - please log in again",
        "NOT_LOGGED_IN"
      );
    }
    throw new HNAuthError("Delete confirmation HMAC not found", "PARSE_ERROR");
  }

  const goto = extractAttributeFromTag(
    confirmHtml,
    "input",
    "name",
    "goto",
    "value"
  );
  return {
    hmac: decodeAttributeValue(hmac),
    goto: goto ? decodeAttributeValue(goto) : `item?id=${itemId}`,
  };
}

/**
 * The text of HN's own message in a response, or "" when there is none. HN
 * reports errors either as a bare page whose body starts with the message
 * ("You have to be logged in to vote.", "Bad login.", "No such item.",
 * "You're posting too fast...", sometimes followed by a login form) or as an
 * orange `<font>` message on a re-rendered form. Words elsewhere on a normal
 * page ("blank" in `target="_blank"`, "slow down" in a comment) are not
 * messages: a full HN page (`hnmain`) contributes only its orange messages.
 */
export function hnMessageText(html: string): string {
  let preamble = "";
  if (!/id\s*=\s*["']?hnmain/i.test(html)) {
    const firstBlock = html.search(/<(table|form|textarea)\b/i);
    preamble = extractTextContent(
      firstBlock === -1 ? html : html.slice(0, firstBlock)
    );
  }
  return [preamble, ...orangeMessages(html)].filter(Boolean).join(" ");
}

/** HN's orange `<font>` messages on a re-rendered form; the lone "*" marker is dropped. */
export function orangeMessages(html: string): string[] {
  return [
    ...html.matchAll(
      /<font\s[^>]*color\s*=\s*["']?#ff6600["']?[^>]*>([\s\S]*?)<\/font>/gi
    ),
  ]
    .map((match) => extractTextContent(match[1]))
    .filter((message) => message !== "" && message !== "*");
}

/**
 * Map a known HN message (see `hnMessageText`) to its typed error, or null
 * when it says nothing we recognise.
 */
export function classifyHNMessage(message: string): HNAuthError | null {
  const text = message.toLowerCase();
  if (
    /not able to serve your requests|too fast|slow down|too many requests/.test(
      text
    )
  ) {
    return new HNAuthError(
      "Rate limited by Hacker News - please wait",
      "RATE_LIMITED"
    );
  }
  if (text.includes("validation required")) {
    return new HNAuthError(
      "Hacker News wants to verify you are human",
      "CAPTCHA_REQUIRED"
    );
  }
  if (/you have to be logged in|please log in|bad login/.test(text)) {
    return new HNAuthError(
      "Session expired - please log in again",
      "NOT_LOGGED_IN"
    );
  }
  if (text.includes("unknown or expired link")) {
    return new HNAuthError("The link on the page expired", "EXPIRED_LINK");
  }
  if (text.includes("no such item")) {
    return new HNAuthError("Item not found", "ITEM_NOT_FOUND");
  }
  return null;
}

/** Throws the typed error for a recognised HN message page; otherwise returns. */
export function assertNoHNMessage(html: string): void {
  const error = classifyHNMessage(hnMessageText(html));
  if (error) throw error;
}

/**
 * The id of the comment `username` just posted, read from the thread page HN
 * redirects to: the highest comment id by that user above `parentId`. Null when
 * none is found (the caller refetches instead of guessing).
 */
export function findOwnCommentId(
  html: string,
  username: string,
  parentId: number
): number | null {
  const rows = [...html.matchAll(/<tr\b[^>]*>/gi)].flatMap((match) => {
    const tag = match[0];
    const isComment = /\bcomtr\b/.test(getAttributeValue(tag, "class") ?? "");
    const id = Number.parseInt(getAttributeValue(tag, "id") ?? "", 10);
    return isComment && Number.isInteger(id)
      ? [{ id, start: match.index ?? 0 }]
      : [];
  });

  const ids = rows.flatMap((row, index) => {
    const segment = html.slice(row.start, rows[index + 1]?.start);
    const author =
      /class\s*=\s*["']?hnuser["']?[^>]*>(?:\s*<[^>]+>)*([^<]*)/i.exec(
        segment
      )?.[1];
    return author?.trim() === username && row.id > parentId ? [row.id] : [];
  });
  return ids.length > 0 ? Math.max(...ids) : null;
}

/**
 * Parse the hidden `fnid` token from HN's submit page (`/submit`). HN's form
 * posts it back to `/r` with `fnop=submit-page`.
 *
 * @throws HNAuthError NOT_LOGGED_IN when HN answered with its login prompt
 *   ("You have to be logged in to submit."), RATE_LIMITED / CAPTCHA_REQUIRED
 *   for a message page, PARSE_ERROR when the form is simply not there
 */
export function parseSubmitFormFnid(html: string): string {
  const fnid = extractAttributeFromTag(html, "input", "name", "fnid", "value");
  if (fnid) return decodeAttributeValue(fnid);

  const known = classifyHNMessage(hnMessageText(html));
  if (known) throw known;
  if (isSignedOutPage(html)) {
    throw new HNAuthError(
      "Session expired - please log in again",
      "NOT_LOGGED_IN"
    );
  }
  throw new HNAuthError("Submit form token not found", "PARSE_ERROR");
}

export interface SubmitOutcome {
  /** The existing item HN redirected to; null when a new story was created. */
  duplicateOf: number | null;
}

/**
 * Read HN's answer to a submit POST. `landedUrl` is where the redirect ended
 * (`Response.url`): HN redirects a successful submission to `newest` and a
 * duplicate URL to the existing item (`item?id=`).
 *
 * @returns `{ duplicateOf: id }` for a duplicate, `{ duplicateOf: null }` for a
 *   new story
 * @throws HNAuthError for HN's messages (too fast, logged out), REJECTED for an
 *   orange message on the re-rendered form (title too long, bad URL, ...) and
 *   PARSE_ERROR for a page that is none of these
 */
export function parseSubmitResponse(
  html: string,
  landedUrl: string
): SubmitOutcome {
  const duplicate = /\/item\?id=(\d+)/.exec(landedUrl)?.[1];
  if (duplicate) return { duplicateOf: Number.parseInt(duplicate, 10) };

  const message = hnMessageText(html);
  const known = classifyHNMessage(message);
  if (known) throw known;

  const [orange] = orangeMessages(html);
  if (orange) {
    throw new HNAuthError(`HN rejected the submission: ${orange}`, "REJECTED");
  }

  if (/\/newest(?:[?#]|$)/.test(landedUrl)) return { duplicateOf: null };

  // HN re-renders the form without a message for a few refusals; it never
  // lands on the list pages in that case.
  if (/<input[^>]*name\s*=\s*["']?fnid/i.test(html)) {
    throw new HNAuthError(
      "HN did not accept the submission. Check the title and link.",
      "REJECTED"
    );
  }
  if (isSignedOutPage(html)) {
    throw new HNAuthError(
      "Session expired - please log in again",
      "NOT_LOGGED_IN"
    );
  }
  throw new HNAuthError(
    "Could not tell whether HN accepted the submission",
    "PARSE_ERROR"
  );
}
