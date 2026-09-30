import { isFiniteNumber, isJsonObject, isString, type JsonValue } from "./json";

/** An HN item as much as reply detection needs. */
export interface HnItem {
  id: number;
  by?: string;
  text?: string;
  type?: string;
  parent?: number;
  kids?: number[];
  deleted?: boolean;
  dead?: boolean;
}

/** Newest submissions inspected per user and run. */
export const SUBMISSIONS_LIMIT = 20;
/** Pushes per user and run, including the "and N more" summary. */
export const MAX_PUSHES_PER_USER = 5;
/** Reply bodies fetched per user and run; older ones are only counted. */
export const MAX_REPLIES_FETCHED = 25;
/** Longest chain of parents walked to find a comment's story. */
export const MAX_PARENT_WALK = 10;

const EXCERPT_LENGTH = 140;

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#x27;": "'",
  "&#x2F;": "/",
  "&#39;": "'",
};

/** Plain text of an HN comment body, cut to a push-sized excerpt. */
export function excerpt(html: string, length = EXCERPT_LENGTH): string {
  const text = html
    .replace(/<p>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(?:amp|lt|gt|quot|#x27|#x2F|#39);/g, (m) => ENTITIES[m] ?? m)
    .replace(/\s+/g, " ")
    .trim();
  return text.length > length ? `${text.slice(0, length).trimEnd()}…` : text;
}

/** Every direct reply (kid) of the given submissions, highest id first. */
export function collectReplyIds(submissions: readonly HnItem[]): number[] {
  const ids = new Set<number>();
  for (const item of submissions) {
    if (item.deleted || item.dead) continue;
    for (const kid of item.kids ?? []) ids.add(kid);
  }
  return [...ids].sort((a, b) => b - a);
}

export interface ReplyDiff {
  /** The new high-water mark to store. */
  highest: number;
  /** Reply ids above the stored mark, newest first. Empty for a baseline. */
  fresh: number[];
  isBaseline: boolean;
}

/**
 * Compares the current reply ids with the stored "highest reply id seen". HN
 * ids only grow, so anything above the mark is new. The first run for a user
 * (`stored === null`) only sets the baseline so nobody is flooded with old
 * replies.
 */
export function diffReplies(
  replyIds: readonly number[],
  stored: number | null
): ReplyDiff {
  const top = replyIds.reduce((max, id) => Math.max(max, id), 0);
  if (stored === null) return { highest: top, fresh: [], isBaseline: true };
  const fresh = replyIds.filter((id) => id > stored).sort((a, b) => b - a);
  return { highest: Math.max(stored, top), fresh, isBaseline: false };
}

/** A reply that should reach the user, with where it lives. */
export interface Reply {
  id: number;
  by: string;
  text: string;
  /** Story to open, when it could be resolved. */
  storyId?: number;
}

/** Drops deleted, dead, textless and own replies (HN names are case-insensitive). */
export function notifiableReplies(
  items: readonly (HnItem | null)[],
  username: string
): HnItem[] {
  const own = username.toLowerCase();
  return items
    .filter((item): item is HnItem => item !== null)
    .filter(
      (item) =>
        !item.deleted &&
        !item.dead &&
        item.by !== undefined &&
        item.by.toLowerCase() !== own &&
        (item.text ?? "").length > 0
    )
    .sort((a, b) => b.id - a.id);
}

export interface ReplyMessage {
  title: string;
  body: string;
  url?: string;
  replyId?: number;
}

export const storyUrl = (storyId: number, commentId: number) =>
  `hnclient://story/${storyId}?commentId=${commentId}`;

/** How many replies get their own push (the rest collapse into one). */
export function individualCount(total: number, max = MAX_PUSHES_PER_USER) {
  return total <= max ? total : max - 1;
}

/**
 * Turns replies (newest first) into at most `max` messages. `extra` counts
 * further replies that were not fetched. When there are more than `max`, the
 * newest `max - 1` are pushed individually and the rest collapse into one
 * "and N more" message (sent first, so it sits below the individual ones).
 */
export function buildReplyMessages(
  replies: readonly Reply[],
  extra = 0,
  max = MAX_PUSHES_PER_USER
): ReplyMessage[] {
  const single = (reply: Reply): ReplyMessage => {
    const message: ReplyMessage = {
      title: `💬 ${reply.by} replied`,
      body: excerpt(reply.text),
      replyId: reply.id,
    };
    if (reply.storyId !== undefined) {
      message.url = storyUrl(reply.storyId, reply.id);
    }
    return message;
  };

  const total = replies.length + extra;
  const shown = replies.slice(0, individualCount(total, max));
  const more = total - shown.length;
  const individual = [...shown].reverse().map(single);
  if (more === 0) return individual;
  return [
    {
      title: "💬 Replies on Hacker News",
      body: `and ${more} more ${more === 1 ? "reply" : "replies"}`,
    },
    ...individual,
  ];
}

/** Reads the fields of an HN Firebase item; null for anything else. */
export function parseHnItem(value: JsonValue): HnItem | null {
  if (!isJsonObject(value) || !isFiniteNumber(value.id)) return null;
  const item: HnItem = { id: value.id };
  if (isString(value.by)) item.by = value.by;
  if (isString(value.text)) item.text = value.text;
  if (isString(value.type)) item.type = value.type;
  if (isFiniteNumber(value.parent)) item.parent = value.parent;
  if (Array.isArray(value.kids)) {
    item.kids = value.kids.filter(isFiniteNumber);
  }
  if (value.deleted === true) item.deleted = true;
  if (value.dead === true) item.dead = true;
  return item;
}
