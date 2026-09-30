import { ALGOLIA_URL } from "../constants";
import { fetchJSON } from "../fetch-json";
import type {
  AlgoliaSearchHit,
  AlgoliaSearchResponse,
  AlgoliaStory,
  HNItem,
} from "../types";
import {
  buildSearchParams,
  DEFAULT_SEARCH_OPTIONS,
  searchEndpoint,
  type SearchOptions,
} from "./search-params";

const algoliaJSON = <T>(path: string, signal?: AbortSignal) =>
  fetchJSON<T>(ALGOLIA_URL, path, "Algolia API error", signal);

export async function getStoryWithComments(
  id: number,
  signal?: AbortSignal
): Promise<AlgoliaStory> {
  return algoliaJSON<AlgoliaStory>(`/items/${id}`, signal);
}

export async function searchStories(
  query: string,
  page = 0,
  hitsPerPage = 30,
  signal?: AbortSignal,
  options: SearchOptions = DEFAULT_SEARCH_OPTIONS
): Promise<AlgoliaSearchResponse> {
  const params = buildSearchParams(
    query,
    options,
    page,
    hitsPerPage,
    Math.floor(Date.now() / 1000)
  );

  return algoliaJSON<AlgoliaSearchResponse>(
    `${searchEndpoint(options.sort)}?${params.toString()}`,
    signal
  );
}

/**
 * Stories that were on the front page within `[start, end)` (unix seconds),
 * highest score first. One page: HN itself shows 30 per day.
 */
export async function getFrontPageStories(
  start: number,
  end: number,
  hitsPerPage = 30,
  signal?: AbortSignal
): Promise<HNItem[]> {
  const params = new URLSearchParams({
    tags: "front_page",
    numericFilters: `created_at_i>=${start},created_at_i<${end}`,
    hitsPerPage: hitsPerPage.toString(),
  });
  const response = await algoliaJSON<AlgoliaSearchResponse>(
    `/search?${params.toString()}`,
    signal
  );
  return response.hits
    .flatMap((hit) => mapHitToHNItem(hit) ?? [])
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

/** Map a search hit to an item; null for a hit without a numeric `objectID`. */
export function mapHitToHNItem(hit: AlgoliaSearchHit): HNItem | null {
  const id = Number.parseInt(hit.objectID, 10);
  if (Number.isNaN(id)) return null;

  return {
    id,
    title: hit.title ?? undefined,
    url: hit.url ?? undefined,
    by: hit.author ?? undefined,
    score: hit.points ?? undefined,
    descendants: hit.num_comments ?? undefined,
    time: hit.created_at_i ?? undefined,
    text: hit.story_text ?? undefined,
    type: "story",
  };
}

/** A comment hit plus the story context Algolia returns with it. */
export interface SearchCommentHit {
  comment: HNItem;
  storyId: number | undefined;
  storyTitle: string | undefined;
}

/** Map a comment search hit; null for a hit without a numeric `objectID`. */
export function mapHitToCommentHit(
  hit: AlgoliaSearchHit
): SearchCommentHit | null {
  const id = Number.parseInt(hit.objectID, 10);
  if (Number.isNaN(id)) return null;

  return {
    comment: {
      id,
      by: hit.author ?? undefined,
      time: hit.created_at_i ?? undefined,
      text: hit.comment_text ?? undefined,
      parent: hit.parent_id ?? undefined,
      type: "comment",
    },
    storyId: hit.story_id ?? undefined,
    storyTitle: hit.story_title ?? undefined,
  };
}
