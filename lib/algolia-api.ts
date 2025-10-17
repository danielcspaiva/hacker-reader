const ALGOLIA_BASE_URL = 'https://hn.algolia.com/api/v1';

export interface AlgoliaComment {
  id: number;
  created_at: string;
  created_at_i: number;
  author: string | null;
  text: string | null;
  points: number | null;
  parent_id: number | null;
  story_id: number;
  children: AlgoliaComment[];
  type: 'comment' | 'story' | 'job' | 'poll' | 'pollopt';
  url: string | null;
  title: string | null;
  options?: any[];
}

export interface AlgoliaStory {
  id: number;
  created_at: string;
  created_at_i: number;
  author: string;
  title: string;
  url: string | null;
  text: string | null;
  points: number;
  parent_id: number | null;
  story_id: number | null;
  children: AlgoliaComment[];
  type: 'story' | 'job' | 'poll' | 'comment';
  options?: any[];
}

async function fetchJSON<T>(path: string): Promise<T> {
  const response = await fetch(`${ALGOLIA_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Algolia API error: ${response.status}`);
  }
  return response.json();
}

export async function getStoryWithComments(id: number): Promise<AlgoliaStory> {
  return fetchJSON<AlgoliaStory>(`/items/${id}`);
}
