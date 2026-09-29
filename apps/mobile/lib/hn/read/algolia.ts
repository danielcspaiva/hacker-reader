import { ALGOLIA_URL } from "../constants";
import { fetchJSON } from "../fetch-json";
import type {
  AlgoliaSearchHit,
  AlgoliaSearchResponse,
  AlgoliaStory,
  HNItem,
} from "../types";

const algoliaJSON = <T>(path: string) =>
  fetchJSON<T>(ALGOLIA_URL, path, "Algolia API error");

export async function getStoryWithComments(id: number): Promise<AlgoliaStory> {
  return algoliaJSON<AlgoliaStory>(`/items/${id}`);
}

export async function searchStories(
  query: string,
  page = 0,
  hitsPerPage = 30
): Promise<AlgoliaSearchResponse> {
  const params = new URLSearchParams({
    query,
    page: page.toString(),
    hitsPerPage: hitsPerPage.toString(),
    tags: "story",
  });

  return algoliaJSON<AlgoliaSearchResponse>(`/search?${params.toString()}`);
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
