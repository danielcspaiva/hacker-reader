import AsyncStorage from "@react-native-async-storage/async-storage";

import { createJsonListStore } from "./json-list-store";

const BOOKMARKS_KEY = "@hn_bookmarks";

export interface BookmarkedStory {
  id: number;
  bookmarkedAt: number;
}

function isBookmarkedStory(value: unknown): value is BookmarkedStory {
  if (typeof value !== "object" || value === null) return false;
  if (!("id" in value) || !("bookmarkedAt" in value)) return false;
  return typeof value.id === "number" && typeof value.bookmarkedAt === "number";
}

const store = createJsonListStore({
  key: BOOKMARKS_KEY,
  guard: isBookmarkedStory,
  storage: AsyncStorage,
});

/** Bookmarked story ids, most recently bookmarked first. Throws if storage fails. */
export async function getBookmarkIds(): Promise<number[]> {
  const bookmarks = await store.read();
  return bookmarks
    .sort((a, b) => b.bookmarkedAt - a.bookmarkedAt)
    .map((b) => b.id);
}

export async function addBookmark(storyId: number): Promise<void> {
  await store.update((bookmarks) =>
    bookmarks.some((b) => b.id === storyId)
      ? bookmarks
      : [{ id: storyId, bookmarkedAt: Date.now() }, ...bookmarks]
  );
}

export async function removeBookmark(storyId: number): Promise<void> {
  await store.update((bookmarks) => bookmarks.filter((b) => b.id !== storyId));
}

export function clearBookmarks(): Promise<void> {
  return store.clear();
}
