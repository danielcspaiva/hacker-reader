/**
 * Pure logic of the Replies inbox: which items answer your own stories and
 * comments, newest first, and how many are unread since a last-seen time. No
 * storage and no React Native, so it is unit-tested in node.
 */

import { stripHTML } from "../html/parse";
import type { HNItem } from "./types";

/** Newest submissions (stories and comments) whose replies are looked at. */
export const REPLIES_SUBMISSIONS_LIMIT = 30;
/** Newest reply ids fetched; older replies fall off the inbox. */
export const REPLIES_FETCH_LIMIT = 100;

const CONTEXT_EXCERPT_LENGTH = 80;

/** A reply and the item of yours it answers. */
export interface ReplyEntry {
  reply: HNItem;
  parent: HNItem;
}

/** An HN item that still exists and has a timestamp (purged items are bare stubs). */
export function isLiveItem(item: HNItem): boolean {
  return !item.deleted && !item.dead && item.time !== undefined;
}

/**
 * The reply ids to fetch: direct kids of your live submissions, highest (newest)
 * id first, capped. HN ids grow over time, so id order is age order.
 */
export function collectReplyIds(
  submissions: readonly HNItem[],
  limit = REPLIES_FETCH_LIMIT
): number[] {
  const ids = new Set<number>();
  for (const item of submissions) {
    if (!isLiveItem(item)) continue;
    for (const kid of item.kids ?? []) ids.add(kid);
  }
  return [...ids].sort((a, b) => b - a).slice(0, limit);
}

/**
 * Pairs each fetched reply with its parent submission, dropping deleted, dead
 * and your own replies (HN names are case-insensitive), newest first.
 */
export function buildReplies(
  submissions: readonly HNItem[],
  replies: readonly HNItem[],
  username: string
): ReplyEntry[] {
  const parents = new Map(submissions.map((item) => [item.id, item]));
  const own = username.toLowerCase();
  const entries: ReplyEntry[] = [];
  for (const reply of replies) {
    if (!isLiveItem(reply) || reply.parent === undefined) continue;
    if (reply.by === undefined || reply.by.toLowerCase() === own) continue;
    const parent = parents.get(reply.parent);
    if (parent) entries.push({ reply, parent });
  }
  return entries.sort(
    (a, b) =>
      (b.reply.time ?? 0) - (a.reply.time ?? 0) || b.reply.id - a.reply.id
  );
}

/** Replies newer than `seenAt` (unix seconds); all of them when never seen. */
export function countUnread(
  entries: readonly ReplyEntry[],
  seenAt: number | undefined
): number {
  if (seenAt === undefined) return entries.length;
  return entries.filter(({ reply }) => (reply.time ?? 0) > seenAt).length;
}

/** The last-seen time once the inbox was viewed: now, or the newest reply if clocks differ. */
export function nextSeenAt(
  entries: readonly ReplyEntry[],
  nowSeconds: number
): number {
  return entries.reduce(
    (max, { reply }) => Math.max(max, reply.time ?? 0),
    nowSeconds
  );
}

/** What a reply answers: the story title, or an excerpt of your comment. */
export function replyContextLabel(parent: HNItem): string {
  if (parent.title) return parent.title;
  const text = parent.text ? stripHTML(parent.text).replace(/\s+/g, " ") : "";
  const excerpt =
    text.length > CONTEXT_EXCERPT_LENGTH
      ? `${text.slice(0, CONTEXT_EXCERPT_LENGTH).trimEnd()}...`
      : text;
  return excerpt ? `Your comment: ${excerpt}` : "Your comment";
}

/** When you last opened the inbox, per username (unix seconds). */
export interface RepliesSeenEntry {
  username: string;
  seenAt: number;
}

export function isRepliesSeenEntry(value: unknown): value is RepliesSeenEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    "username" in value &&
    typeof value.username === "string" &&
    "seenAt" in value &&
    typeof value.seenAt === "number"
  );
}

export function seenAtFor(
  entries: readonly RepliesSeenEntry[],
  username: string
): number | undefined {
  return entries.find((entry) => entry.username === username)?.seenAt;
}

/** Records a view; the time only moves forward. */
export function withSeenAt(
  entries: RepliesSeenEntry[],
  username: string,
  seenAt: number
): RepliesSeenEntry[] {
  const previous = seenAtFor(entries, username) ?? 0;
  return [
    ...entries.filter((entry) => entry.username !== username),
    { username, seenAt: Math.max(previous, seenAt) },
  ];
}

/** The user who turned reply notifications on from this device. */
export interface ReplyNotificationsEntry {
  username: string;
}

export function isReplyNotificationsEntry(
  value: unknown
): value is ReplyNotificationsEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    "username" in value &&
    typeof value.username === "string"
  );
}
