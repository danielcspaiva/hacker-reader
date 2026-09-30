/**
 * Pure Algolia search parameter building: query text + options in,
 * URLSearchParams out. No network and no React Native, so it is node-tested.
 */

export const SEARCH_SORTS = ["relevance", "date"] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];

export const SEARCH_SCOPES = ["story", "comment"] as const;
export type SearchScope = (typeof SEARCH_SCOPES)[number];

export const SEARCH_DATE_RANGES = [
  "any",
  "day",
  "week",
  "month",
  "year",
] as const;
export type SearchDateRange = (typeof SEARCH_DATE_RANGES)[number];

export const SEARCH_MIN_POINTS = [0, 10, 100, 500] as const;
export type SearchMinPoints = (typeof SEARCH_MIN_POINTS)[number];

export interface SearchOptions {
  sort: SearchSort;
  scope: SearchScope;
  dateRange: SearchDateRange;
  /** Stories only; 0 means no minimum. */
  minPoints: SearchMinPoints;
}

export const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  sort: "relevance",
  scope: "story",
  dateRange: "any",
  minPoints: 0,
};

const DATE_RANGE_SECONDS: Record<Exclude<SearchDateRange, "any">, number> = {
  day: 24 * 60 * 60,
  week: 7 * 24 * 60 * 60,
  month: 30 * 24 * 60 * 60,
  year: 365 * 24 * 60 * 60,
};

/** True when a filter (not sort or scope) differs from its default. */
export function hasActiveFilters(options: SearchOptions): boolean {
  return (
    options.dateRange !== DEFAULT_SEARCH_OPTIONS.dateRange ||
    (options.scope === "story" && options.minPoints > 0)
  );
}

/** True when anything differs from the defaults (drives the filled icon). */
export function hasNonDefaultOptions(options: SearchOptions): boolean {
  return (
    options.sort !== DEFAULT_SEARCH_OPTIONS.sort ||
    options.scope !== DEFAULT_SEARCH_OPTIONS.scope ||
    hasActiveFilters(options)
  );
}

export interface ParsedSearchQuery {
  text: string;
  author: string | null;
}

const AUTHOR_TOKEN = /(?:^|\s)author:(\S+)/i;

/**
 * Splits a leading or inline `author:<name>` token off the query box text.
 * Only the first token counts; the rest of the text is the search terms.
 */
export function parseSearchQuery(raw: string): ParsedSearchQuery {
  const match = AUTHOR_TOKEN.exec(raw);
  if (!match) return { text: raw.trim(), author: null };
  const text = raw.replace(match[0], " ").replace(/\s+/g, " ").trim();
  return { text, author: match[1] };
}

/** Whether the query box holds something to search for. */
export function hasSearchableQuery(raw: string): boolean {
  const { text, author } = parseSearchQuery(raw);
  return text.length > 0 || author !== null;
}

/**
 * Algolia request params. `now` (epoch seconds) is injected so date ranges
 * are testable. Order is fixed: query, page, hitsPerPage, tags, numericFilters.
 */
export function buildSearchParams(
  rawQuery: string,
  options: SearchOptions,
  page: number,
  hitsPerPage: number,
  now: number
): URLSearchParams {
  const { text, author } = parseSearchQuery(rawQuery);
  const tags: string[] = [options.scope];
  if (author) tags.push(`author_${author}`);

  const numericFilters: string[] = [];
  if (options.dateRange !== "any") {
    const since = now - DATE_RANGE_SECONDS[options.dateRange];
    numericFilters.push(`created_at_i>${since}`);
  }
  if (options.scope === "story" && options.minPoints > 0) {
    numericFilters.push(`points>=${options.minPoints}`);
  }

  const params = new URLSearchParams({
    query: text,
    page: page.toString(),
    hitsPerPage: hitsPerPage.toString(),
    tags: tags.join(","),
  });
  if (numericFilters.length > 0) {
    params.set("numericFilters", numericFilters.join(","));
  }
  return params;
}

/** `/search` (relevance) or `/search_by_date` (newest first). */
export function searchEndpoint(sort: SearchSort): string {
  return sort === "date" ? "/search_by_date" : "/search";
}

/** A stored record before validation: any field may be missing or stale. */
export interface StoredSearchOptions {
  sort?: unknown;
  scope?: unknown;
  dateRange?: unknown;
  minPoints?: unknown;
}

/** Narrows a stored record to valid options, field by field (older shapes fall back to defaults). */
export function parseSearchOptions(stored: StoredSearchOptions): SearchOptions {
  const pick = <T>(list: readonly T[], input: unknown, fallback: T): T =>
    list.find((item) => item === input) ?? fallback;
  return {
    sort: pick(SEARCH_SORTS, stored.sort, DEFAULT_SEARCH_OPTIONS.sort),
    scope: pick(SEARCH_SCOPES, stored.scope, DEFAULT_SEARCH_OPTIONS.scope),
    dateRange: pick(
      SEARCH_DATE_RANGES,
      stored.dateRange,
      DEFAULT_SEARCH_OPTIONS.dateRange
    ),
    minPoints: pick(
      SEARCH_MIN_POINTS,
      stored.minPoints,
      DEFAULT_SEARCH_OPTIONS.minPoints
    ),
  };
}
