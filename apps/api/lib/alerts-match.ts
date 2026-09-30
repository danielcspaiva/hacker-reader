/**
 * Keyword alerts: the rule shape, its validation and story matching. Pure.
 * The matching semantics are a copy of the app's mutes matcher
 * (`apps/mobile/lib/hn/mutes-match.ts`): whole words in the title, phrases
 * across any whitespace, `site:example.com` also matches subdomains.
 */

import { isFiniteNumber, isJsonObject, isString, type JsonValue } from "./json";

/** `minPoints` choices offered by the app. */
export const ALERT_MIN_POINTS = [10, 50, 100, 250, 500] as const;
export const MAX_ALERTS = 20;
export const MAX_ALERT_QUERY = 60;
const MAX_ALERT_ID = 40;

/** A keyword or phrase, or `site:example.com`, plus the points it needs. */
export type AlertRule = {
  id: string;
  query: string;
  minPoints: number;
};

/** The story fields an alert looks at. */
export interface AlertStory {
  id: number;
  title: string;
  url?: string;
  points: number;
}

const ALERT_ID = /^[\w-]{1,40}$/;
const SITE_PREFIX = /^site:/i;
const HOST = /^[a-z0-9-]+(\.[a-z0-9-]+)*$/;

function hasControlChars(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

const WORD_CHAR = "[\\p{L}\\p{N}_]";
/** ASCII word characters, for engines without Unicode property escapes. */
const ASCII_WORD_CHAR = "[A-Za-z0-9_]";

/** Hostname without `www.`, or null when `url` is missing or not a URL. */
export function getDomain(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** The host of a `site:` query, null for a keyword query or an invalid host. */
export function siteOfQuery(query: string): string | null {
  if (!SITE_PREFIX.test(query)) return null;
  const host = query.slice("site:".length).toLowerCase();
  return HOST.test(host) ? host : null;
}

function isValidQuery(query: string): boolean {
  if (query.length === 0 || query.length > MAX_ALERT_QUERY) return false;
  if (hasControlChars(query)) return false;
  if (SITE_PREFIX.test(query)) return siteOfQuery(query) !== null;
  return true;
}

/**
 * Validates the `prefs.alerts` value: at most 20 rules with a short id, a
 * trimmed query of at most 60 characters and one of the `minPoints` choices.
 * Unknown fields are dropped.
 */
export function parseAlerts(
  value: JsonValue | undefined
): { ok: true; value: AlertRule[] } | { ok: false; error: string } {
  if (!Array.isArray(value)) {
    return { ok: false, error: "prefs.alerts must be a list" };
  }
  if (value.length > MAX_ALERTS) {
    return { ok: false, error: `prefs.alerts allows at most ${MAX_ALERTS}` };
  }
  const rules: AlertRule[] = [];
  for (const entry of value) {
    if (!isJsonObject(entry)) {
      return { ok: false, error: "prefs.alerts entries must be objects" };
    }
    const { id, query, minPoints } = entry;
    if (!isString(id) || !ALERT_ID.test(id) || id.length > MAX_ALERT_ID) {
      return { ok: false, error: "prefs.alerts id is invalid" };
    }
    if (!isString(query) || query !== query.trim() || !isValidQuery(query)) {
      return {
        ok: false,
        error: `prefs.alerts query must be 1 to ${MAX_ALERT_QUERY} characters`,
      };
    }
    if (
      !isFiniteNumber(minPoints) ||
      !ALERT_MIN_POINTS.some((allowed) => allowed === minPoints)
    ) {
      return {
        ok: false,
        error: `prefs.alerts minPoints must be one of ${ALERT_MIN_POINTS.join(", ")}`,
      };
    }
    rules.push({ id, query, minPoints });
  }
  return { ok: true, value: rules };
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function keywordPattern(keyword: string, wordChar = WORD_CHAR): string {
  // Phrases match across any whitespace run. Boundaries are lookarounds so
  // keywords that end in punctuation ("c++") still work, and "ai" never hits "said".
  const body = keyword.split(" ").map(escapeRegExp).join("\\s+");
  return `(?<!${wordChar})${body}(?!${wordChar})`;
}

function compileKeyword(keyword: string): RegExp {
  try {
    return new RegExp(keywordPattern(keyword), "iu");
  } catch {
    return new RegExp(keywordPattern(keyword, ASCII_WORD_CHAR), "i");
  }
}

/** Collapses whitespace and lowercases, like the mutes keyword normaliser. */
function normalizeKeyword(query: string): string {
  return query.trim().replace(/\s+/g, " ").toLowerCase();
}

/** True when the story's title (or, for `site:`, its host) matches `query`. */
export type TextMatcher = (story: Pick<AlertStory, "title" | "url">) => boolean;

/** Compiles a query once; a `site:` query with an invalid host never matches. */
export function compileQuery(query: string): TextMatcher {
  if (SITE_PREFIX.test(query)) {
    const site = siteOfQuery(query);
    if (!site) return () => false;
    return (story) => {
      let host = getDomain(story.url);
      // "foo.medium.com" matches "medium.com": try each parent suffix.
      while (host) {
        if (host === site) return true;
        const dot = host.indexOf(".");
        host = dot === -1 ? null : host.slice(dot + 1);
      }
      return false;
    };
  }
  const keyword = normalizeKeyword(query);
  if (!keyword) return () => false;
  const regex = compileKeyword(keyword);
  return (story) => !!story.title && regex.test(story.title);
}

/** Compiled queries shared by all devices of one run. */
export type QueryCache = Map<string, TextMatcher>;

/**
 * The first rule the story satisfies (text match and enough points), or
 * undefined. `cache` avoids recompiling the same query for every device.
 */
export function firstMatchingRule(
  rules: readonly AlertRule[],
  story: AlertStory,
  cache: QueryCache = new Map()
): AlertRule | undefined {
  for (const rule of rules) {
    if (story.points < rule.minPoints) continue;
    let matches = cache.get(rule.query);
    if (!matches) {
      matches = compileQuery(rule.query);
      cache.set(rule.query, matches);
    }
    if (matches(story)) return rule;
  }
  return undefined;
}
