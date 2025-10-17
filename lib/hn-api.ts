const BASE_URL = 'https://hacker-news.firebaseio.com/v0';

export interface HNItem {
  id: number;
  deleted?: boolean;
  type?: 'job' | 'story' | 'comment' | 'poll' | 'pollopt';
  by?: string;
  time?: number;
  text?: string;
  dead?: boolean;
  parent?: number;
  poll?: number;
  kids?: number[];
  url?: string;
  score?: number;
  title?: string;
  parts?: number[];
  descendants?: number;
}

export interface HNUser {
  id: string;
  created: number;
  karma: number;
  about?: string;
  submitted?: number[];
}

async function fetchJSON<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

export async function getTopStories(offset = 0, limit = 30): Promise<number[]> {
  const ids = await fetchJSON<number[]>('/topstories.json');
  return ids.slice(offset, offset + limit);
}

export async function getNewStories(offset = 0, limit = 30): Promise<number[]> {
  const ids = await fetchJSON<number[]>('/newstories.json');
  return ids.slice(offset, offset + limit);
}

export async function getAskStories(offset = 0, limit = 30): Promise<number[]> {
  const ids = await fetchJSON<number[]>('/askstories.json');
  return ids.slice(offset, offset + limit);
}

export async function getShowStories(offset = 0, limit = 30): Promise<number[]> {
  const ids = await fetchJSON<number[]>('/showstories.json');
  return ids.slice(offset, offset + limit);
}

export async function getJobStories(offset = 0, limit = 30): Promise<number[]> {
  const ids = await fetchJSON<number[]>('/jobstories.json');
  return ids.slice(offset, offset + limit);
}

export async function getItem(id: number): Promise<HNItem> {
  return fetchJSON<HNItem>(`/item/${id}.json`);
}

export async function getUser(id: string): Promise<HNUser> {
  return fetchJSON<HNUser>(`/user/${id}.json`);
}

export async function getItems(ids: number[]): Promise<HNItem[]> {
  return Promise.all(ids.map(id => getItem(id)));
}
