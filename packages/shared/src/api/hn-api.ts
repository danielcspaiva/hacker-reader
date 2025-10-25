import type { HNItem, HNUser } from '../types';

const BASE_URL = 'https://hacker-news.firebaseio.com/v0';

async function fetchJSON<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json() as Promise<T>;
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
