/**
 * Keyword alerts: candidate stories, the per-install sent list and the push
 * messages. Pure apart from the Algolia fetch. See `alerts-cron.ts` for the run.
 */

import {
  firstMatchingRule,
  siteOfQuery,
  type AlertRule,
  type AlertStory,
  type QueryCache,
} from "./alerts-match";
import { isFiniteNumber, isJsonObject, isString, type JsonValue } from "./json";
import type { PushMessage } from "./push";

const ALGOLIA_SEARCH_BY_DATE = "https://hn.algolia.com/api/v1/search_by_date";

/** Stories older than this are not candidates (and never re-match). */
export const CANDIDATE_WINDOW_SECONDS = 48 * 60 * 60;
/** Stories below this can never satisfy an alert (the lowest `minPoints`). */
export const CANDIDATE_MIN_POINTS = 10;
export const CANDIDATE_PAGE_SIZE = 1000;
/** Algolia pages fetched per run at most. */
export const MAX_CANDIDATE_PAGES = 4;

/** Pushes per install and run, the "N more" summary included. */
export const MAX_PUSHES_PER_INSTALL = 3;
/** Sent ids are kept a little longer than the candidate window. */
const SENT_RETENTION_SECONDS = CANDIDATE_WINDOW_SECONDS + 2 * 60 * 60;
const MAX_SENT_ENTRIES = 1000;
const MAX_BODY = 200;

export const sentKey = (installId: string) => `alerts:sent:${installId}`;

/** A story with its creation time (unix seconds), for pruning the sent list. */
export interface Candidate extends AlertStory {
  createdAt: number;
}

export function parseCandidate(hit: JsonValue): Candidate | null {
  if (!isJsonObject(hit)) return null;
  const { objectID, title, url, points, created_at_i: createdAt } = hit;
  const id = isString(objectID) ? Number(objectID) : NaN;
  if (!Number.isInteger(id) || id <= 0) return null;
  if (!isString(title) || title.length === 0) return null;
  if (!isFiniteNumber(points) || !isFiniteNumber(createdAt)) return null;
  const candidate: Candidate = { id, title, points, createdAt };
  if (isString(url) && url) candidate.url = url;
  return candidate;
}

export interface CandidateFetchOptions {
  fetch?: typeof fetch;
  /** Unix seconds. */
  nowSeconds: number;
  maxPages?: number;
  timeoutMs?: number;
}

/**
 * Stories of the last 48 hours with 10+ points, newest first: one Algolia
 * request per page of 1000 hits, at most `maxPages` (a busy two days fit in
 * about two). Throws when the first page fails; a later page failing keeps
 * what was fetched. Duplicates across pages (new stories shift pages) are dropped.
 */
export async function fetchCandidates(
  options: CandidateFetchOptions
): Promise<Candidate[]> {
  const doFetch = options.fetch ?? fetch;
  const maxPages = options.maxPages ?? MAX_CANDIDATE_PAGES;
  const since = options.nowSeconds - CANDIDATE_WINDOW_SECONDS;
  const byId = new Map<number, Candidate>();

  for (let page = 0; page < maxPages; page++) {
    const url =
      `${ALGOLIA_SEARCH_BY_DATE}?tags=story` +
      `&numericFilters=${encodeURIComponent(
        `created_at_i>${since},points>=${CANDIDATE_MIN_POINTS}`
      )}` +
      `&hitsPerPage=${CANDIDATE_PAGE_SIZE}&page=${page}`;
    let body: JsonValue;
    try {
      const response = await doFetch(url, {
        signal: AbortSignal.timeout(options.timeoutMs ?? 15_000),
      });
      if (!response.ok) throw new Error(`Algolia responded ${response.status}`);
      body = await response.json();
    } catch (error) {
      if (page === 0) throw error;
      break;
    }
    if (!isJsonObject(body) || !Array.isArray(body.hits)) {
      if (page === 0) throw new Error("Algolia answered an unexpected body");
      break;
    }
    for (const hit of body.hits) {
      const candidate = parseCandidate(hit);
      if (candidate && !byId.has(candidate.id))
        byId.set(candidate.id, candidate);
    }
    const pages = isFiniteNumber(body.nbPages) ? body.nbPages : 1;
    if (page + 1 >= pages) break;
  }
  return [...byId.values()];
}

/** One entry of `alerts:sent:<installId>`. */
export interface SentEntry {
  /** Story id. */
  id: number;
  /** Story creation time (unix seconds); used to prune. */
  t: number;
}

export function parseSent(value: unknown): SentEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is SentEntry =>
      typeof entry === "object" &&
      entry !== null &&
      "id" in entry &&
      "t" in entry &&
      typeof entry.id === "number" &&
      typeof entry.t === "number"
  );
}

/** Adds `added`, drops stories too old to match again, caps the list. */
export function updateSent(
  sent: readonly SentEntry[],
  added: readonly Candidate[],
  nowSeconds: number
): SentEntry[] {
  const known = new Set(sent.map((entry) => entry.id));
  const merged = [
    ...sent,
    ...added
      .filter((story) => !known.has(story.id))
      .map((story) => ({ id: story.id, t: story.createdAt })),
  ];
  return merged
    .filter((entry) => entry.t >= nowSeconds - SENT_RETENTION_SECONDS)
    .sort((a, b) => b.t - a.t)
    .slice(0, MAX_SENT_ENTRIES);
}

export interface AlertMatch {
  story: Candidate;
  rule: AlertRule;
}

/**
 * The stories an install's alerts match that it was not told about yet,
 * most points first (ties: newest).
 */
export function findMatches(
  rules: readonly AlertRule[],
  candidates: readonly Candidate[],
  sent: readonly SentEntry[],
  cache?: QueryCache
): AlertMatch[] {
  const already = new Set(sent.map((entry) => entry.id));
  const matches: AlertMatch[] = [];
  for (const story of candidates) {
    if (already.has(story.id)) continue;
    const rule = firstMatchingRule(rules, story, cache);
    if (rule) matches.push({ story, rule });
  }
  return matches.sort(
    (a, b) =>
      b.story.points - a.story.points || b.story.createdAt - a.story.createdAt
  );
}

export const alertStoryUrl = (storyId: number) => `hnclient://story/${storyId}`;

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/** What the push title shows for a rule: the keyword, or the site's host. */
export function ruleLabel(rule: AlertRule): string {
  return siteOfQuery(rule.query) ?? rule.query;
}

export interface AlertPlan {
  messages: Omit<PushMessage, "to">[];
  /** Every story the messages cover, individual or collapsed. */
  covered: Candidate[];
}

/**
 * At most `max` messages. With more matches than that, the top `max - 1` get
 * their own push and the rest collapse into one "N more stories match your
 * alerts" push that just opens the app.
 */
export function planPushes(
  matches: readonly AlertMatch[],
  max = MAX_PUSHES_PER_INSTALL
): AlertPlan {
  const individual = matches.length <= max ? matches.length : max - 1;
  const messages: AlertPlan["messages"] = matches
    .slice(0, individual)
    .map(({ story, rule }) => ({
      title: `🔔 ${truncate(ruleLabel(rule), 60)} · ${story.points} points`,
      body: truncate(story.title, MAX_BODY),
      sound: "default",
      threadId: "alerts",
      data: { url: alertStoryUrl(story.id), kind: "alert" },
    }));
  const rest = matches.length - individual;
  if (rest > 0) {
    messages.push({
      title: "🔔 Keyword alerts",
      body: `${rest} more ${rest === 1 ? "story matches" : "stories match"} your alerts`,
      sound: "default",
      threadId: "alerts",
      data: { kind: "alert" },
    });
  }
  return { messages, covered: matches.map((match) => match.story) };
}
