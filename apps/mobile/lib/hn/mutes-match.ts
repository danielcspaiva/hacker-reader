/**
 * Muted keywords and sites: normalisation and matching. Pure (no React Native),
 * so it is node-tested. `createMuteFilter` compiles the list once (one regex
 * for all keywords, a set for domains); call it per list change, not per card.
 */

import { getDomain } from "@/lib/format/url";

export type MuteKind = "keyword" | "domain";

export interface Mute {
  kind: MuteKind;
  /** Normalised by `normalizeMuteValue`. */
  value: string;
  createdAt: number;
}

/** The story fields a mute looks at. */
export interface Muteable {
  title?: string;
  url?: string;
}

const WORD_CHAR = "[\\p{L}\\p{N}_]";
/** ASCII word characters, for engines without Unicode property escapes. */
const ASCII_WORD_CHAR = "[A-Za-z0-9_]";

/** Lowercase, collapse whitespace. */
function normalizeKeyword(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Domain from a pasted URL or bare host: no scheme, `www.`, port, path or
 * trailing dot. Null when it doesn't look like a host.
 */
function normalizeDomain(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || /\s/.test(trimmed)) return null;
  const host = getDomain(
    /^[a-z][a-z0-9+.-]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`
  );
  const cleaned = host?.replace(/\.$/, "");
  return cleaned && /^[a-z0-9-]+(\.[a-z0-9-]+)*$/.test(cleaned)
    ? cleaned
    : null;
}

/** The value to store for user input, or null when it is empty or invalid. */
export function normalizeMuteValue(kind: MuteKind, raw: string): string | null {
  if (kind === "domain") return normalizeDomain(raw);
  const keyword = normalizeKeyword(raw);
  return keyword || null;
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function keywordPattern(keyword: string, wordChar = WORD_CHAR): string {
  // Phrases match across any whitespace run. Boundaries are lookarounds so
  // keywords that end in punctuation ("c++") still work, and "ai" never hits "said".
  const body = keyword.split(" ").map(escapeRegExp).join("\\s+");
  return `(?<!${wordChar})${body}(?!${wordChar})`;
}

/**
 * One regex for every keyword. Falls back to ASCII word boundaries if the JS
 * engine rejects Unicode property escapes, so a mute can never break the feed.
 */
function compileKeywords(keywords: string[]): RegExp {
  try {
    return new RegExp(keywords.map((k) => keywordPattern(k)).join("|"), "iu");
  } catch {
    return new RegExp(
      keywords.map((k) => keywordPattern(k, ASCII_WORD_CHAR)).join("|"),
      "i"
    );
  }
}

/** Returns a predicate: true when the story matches any mute. */
export function createMuteFilter(
  mutes: readonly Mute[]
): (story: Muteable) => boolean {
  const keywords = mutes
    .filter((m) => m.kind === "keyword")
    .map((m) => m.value);
  const domains = new Set(
    mutes.filter((m) => m.kind === "domain").map((m) => m.value)
  );
  const keywordRegex = keywords.length ? compileKeywords(keywords) : null;

  if (!keywordRegex && domains.size === 0) return () => false;

  return (story) => {
    if (keywordRegex && story.title && keywordRegex.test(story.title))
      return true;
    if (domains.size > 0) {
      let host = getDomain(story.url);
      // "foo.medium.com" is muted by "medium.com": try each parent suffix.
      while (host) {
        if (domains.has(host)) return true;
        const dot = host.indexOf(".");
        host = dot === -1 ? null : host.slice(dot + 1);
      }
    }
    return false;
  };
}
