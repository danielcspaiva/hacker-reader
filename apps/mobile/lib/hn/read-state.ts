/**
 * Pure read-state logic: which stories you have opened and which comments are
 * new since. No storage and no React Native, so it is unit-tested in node.
 *
 * "New since your last visit" relies on HN ids increasing monotonically: a
 * comment is new when its id is above the highest comment id seen at the
 * previous visit, so one number per story is enough.
 */

import type { Comment } from "./types";

/** Oldest entries are dropped past this, newest first. */
export const MAX_READ_STORIES = 2000;

export interface ReadStoryEntry {
  id: number;
  /** Unix ms of the last visit. */
  readAt: number;
  /** The story's comment count at the last visit. */
  commentCount: number;
  /** Highest comment id seen at the last visit; unset when marked read from the feed. */
  maxSeenCommentId?: number;
}

export function isReadStoryEntry(value: unknown): value is ReadStoryEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "number" &&
    "readAt" in value &&
    typeof value.readAt === "number" &&
    "commentCount" in value &&
    typeof value.commentCount === "number" &&
    (!("maxSeenCommentId" in value) ||
      value.maxSeenCommentId === undefined ||
      typeof value.maxSeenCommentId === "number")
  );
}

/** Puts `entry` first, replacing any earlier one for the story, and applies the cap. */
export function upsertReadEntry(
  entries: ReadStoryEntry[],
  entry: ReadStoryEntry,
  max = MAX_READ_STORIES
): ReadStoryEntry[] {
  return [entry, ...entries.filter((item) => item.id !== entry.id)].slice(
    0,
    max
  );
}

export function removeReadEntry(
  entries: ReadStoryEntry[],
  id: number
): ReadStoryEntry[] {
  return entries.some((item) => item.id === id)
    ? entries.filter((item) => item.id !== id)
    : entries;
}

/** Opening a story: seen comments move up to the highest id now loaded. */
export function recordVisit(
  entries: ReadStoryEntry[],
  visit: {
    id: number;
    now: number;
    commentCount: number;
    maxCommentId: number | undefined;
  }
): ReadStoryEntry[] {
  const previous = entries.find((item) => item.id === visit.id);
  const maxSeenCommentId = Math.max(
    previous?.maxSeenCommentId ?? 0,
    visit.maxCommentId ?? 0
  );
  return upsertReadEntry(entries, {
    id: visit.id,
    readAt: visit.now,
    commentCount: visit.commentCount,
    ...(maxSeenCommentId > 0 && { maxSeenCommentId }),
  });
}

/** "Mark as Read" from the feed: no comments were actually seen, so the max id is kept as is. */
export function markRead(
  entries: ReadStoryEntry[],
  story: { id: number; now: number; commentCount: number }
): ReadStoryEntry[] {
  const previous = entries.find((item) => item.id === story.id);
  return upsertReadEntry(entries, {
    id: story.id,
    readAt: story.now,
    commentCount: story.commentCount,
    ...(previous?.maxSeenCommentId !== undefined && {
      maxSeenCommentId: previous.maxSeenCommentId,
    }),
  });
}

/** Highest comment id in a tree, dead and deleted rows included; undefined when empty. */
export function maxCommentId(comments: Comment[]): number | undefined {
  let max: number | undefined;
  const stack = [...comments];
  while (stack.length > 0) {
    const comment = stack.pop()!;
    if (max === undefined || comment.id > max) max = comment.id;
    for (const child of comment.children ?? []) stack.push(child);
  }
  return max;
}

/** Comments added since the last visit, for the feed's "+N" badge. */
export function newCommentCount(
  entry: ReadStoryEntry | undefined,
  commentCount: number
): number {
  return entry ? Math.max(0, commentCount - entry.commentCount) : 0;
}

/** Whether a comment is new; false without a previous visit that recorded comment ids. */
export function isNewComment(
  commentId: number,
  previous: ReadStoryEntry | undefined
): boolean {
  return (
    previous?.maxSeenCommentId !== undefined &&
    commentId > previous.maxSeenCommentId
  );
}

const indexCache = new WeakMap<ReadStoryEntry[], Map<number, ReadStoryEntry>>();

/** id -> entry lookup, built once per entries array so a feed of cards does O(1) reads. */
export function readEntryIndex(
  entries: ReadStoryEntry[]
): Map<number, ReadStoryEntry> {
  let index = indexCache.get(entries);
  if (!index) {
    index = new Map(entries.map((entry) => [entry.id, entry]));
    indexCache.set(entries, index);
  }
  return index;
}
