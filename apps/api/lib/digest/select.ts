import type { JsonValue } from "../json";
import { isFiniteNumber, isJsonObject, isString } from "../json";
import { commentHtmlToText, truncateChars } from "../summaries/text";

export const DIGEST_STORIES = 8;
/** How many Algolia hits to fetch before sorting by points. */
export const CANDIDATE_HITS = 50;
const STORY_TEXT_CHARS = 300;

export interface Candidate {
  id: number;
  title: string;
  /** The article URL, or the HN item page for a text post. */
  url: string;
  domain: string;
  points: number;
  comments: number;
  /** Plain-text start of an Ask HN / text post; fed to the model only. */
  text?: string;
}

const hnUrl = (id: number) => `https://news.ycombinator.com/item?id=${id}`;

/** Host without a leading `www.`; the HN domain for a missing or bad URL. */
export function domainOf(url: string | undefined): string {
  if (!url) return "news.ycombinator.com";
  try {
    return (
      new URL(url).hostname.replace(/^www\./, "") || "news.ycombinator.com"
    );
  } catch {
    return "news.ycombinator.com";
  }
}

function isHttpUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/** One Algolia `search` hit as a candidate; null when it is unusable. */
export function parseHit(hit: JsonValue): Candidate | null {
  if (!isJsonObject(hit)) return null;
  const id = isString(hit.objectID) ? Number(hit.objectID) : NaN;
  if (!Number.isInteger(id) || id <= 0) return null;
  const title = isString(hit.title) ? hit.title.trim() : "";
  if (!title) return null;

  const url = isString(hit.url) && isHttpUrl(hit.url) ? hit.url : hnUrl(id);
  const candidate: Candidate = {
    id,
    title,
    url,
    domain: domainOf(url),
    points: isFiniteNumber(hit.points) ? hit.points : 0,
    comments: isFiniteNumber(hit.num_comments) ? hit.num_comments : 0,
  };
  if (isString(hit.story_text) && hit.story_text) {
    const text = commentHtmlToText(hit.story_text);
    if (text) candidate.text = truncateChars(text, STORY_TEXT_CHARS);
  }
  return candidate;
}

/** Parses an Algolia `search` response body into candidates. */
export function parseSearchResponse(body: JsonValue): Candidate[] {
  if (!isJsonObject(body) || !Array.isArray(body.hits)) return [];
  return body.hits.flatMap((hit) => {
    const candidate = parseHit(hit);
    return candidate ? [candidate] : [];
  });
}

/**
 * The stories worth a digest slot: duplicates removed, most points first
 * (ties: more comments, then the newer id), at most `limit`.
 */
export function selectTopStories(
  candidates: readonly Candidate[],
  limit: number = DIGEST_STORIES
): Candidate[] {
  const unique = new Map<number, Candidate>();
  for (const candidate of candidates) unique.set(candidate.id, candidate);
  return [...unique.values()]
    .sort(
      (a, b) => b.points - a.points || b.comments - a.comments || b.id - a.id
    )
    .slice(0, limit);
}

/** Algolia `search` URL for stories created after `sinceSeconds`. */
export function searchUrl(sinceSeconds: number): string {
  const params = new URLSearchParams({
    tags: "story",
    numericFilters: `created_at_i>${Math.floor(sinceSeconds)}`,
    hitsPerPage: String(CANDIDATE_HITS),
  });
  return `https://hn.algolia.com/api/v1/search?${params}`;
}
