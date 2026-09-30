/** Stories you have opened (capped, newest first), persisted in AsyncStorage. */

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  isReadStoryEntry,
  markRead,
  recordVisit,
  removeReadEntry,
  type ReadStoryEntry,
} from "../read-state";
import { createJsonListStore } from "./json-list-store";

export const READ_STORIES_KEY = "@read_stories";

const store = createJsonListStore({
  key: READ_STORIES_KEY,
  guard: isReadStoryEntry,
  storage: AsyncStorage,
});

/** Throws if storage fails. */
export function getReadStories(): Promise<ReadStoryEntry[]> {
  return store.read();
}

/** Resolves to the list that was written. */
export function recordStoryVisit(visit: {
  id: number;
  commentCount: number;
  maxCommentId: number | undefined;
}): Promise<ReadStoryEntry[]> {
  return store.update((entries) =>
    recordVisit(entries, { ...visit, now: Date.now() })
  );
}

export function markStoryRead(story: {
  id: number;
  commentCount: number;
}): Promise<ReadStoryEntry[]> {
  return store.update((entries) =>
    markRead(entries, { ...story, now: Date.now() })
  );
}

export function markStoryUnread(id: number): Promise<ReadStoryEntry[]> {
  return store.update((entries) => removeReadEntry(entries, id));
}

export function clearReadStories(): Promise<void> {
  return store.clear();
}
