// Pure helpers for the widget payloads (no React Native imports, so they are node-tested).
// lib/widgets/sync.ts does the fetching and the native calls; this file shapes the data.
import { getDomain } from "@/lib/format/url";
import { STORY_CATEGORIES, type HNItem, type StoryCategory } from "@/lib/hn";

/** The lean story the widget layouts read (title, id, points, comments, domain, time). */
export type WidgetStory = {
  id: number;
  title: string;
  score: number;
  time: number;
  comments: number;
  domain?: string;
};

/** Stories per category; a missing or empty list means "not loaded yet". */
export type WidgetStories = Partial<Record<StoryCategory, WidgetStory[]>>;

export function toWidgetStory(item: HNItem): WidgetStory | null {
  if (item.deleted || item.dead || !item.title) return null;
  return {
    id: item.id,
    title: item.title,
    score: item.score ?? 0,
    time: item.time ?? 0,
    comments: item.descendants ?? 0,
    domain: getDomain(item.url) ?? undefined,
  };
}

/** Widget stories for `ids`, in that order; ids whose item is missing or dead drop out. */
export function orderedWidgetStories(
  ids: number[],
  items: HNItem[],
  limit: number
): WidgetStory[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  return ids
    .map((id) => byId.get(id))
    .filter((item): item is HNItem => item != null)
    .map(toWidgetStory)
    .filter((story): story is WidgetStory => story != null)
    .slice(0, limit);
}

/**
 * Stories for every category from one shared item fetch. `idLists` holds each
 * category's candidate ids, or null when that list could not be fetched.
 */
export function buildCategoryStories(
  idLists: Partial<Record<StoryCategory, number[] | null>>,
  items: HNItem[],
  limit: number
): Partial<Record<StoryCategory, WidgetStory[] | null>> {
  const result: Partial<Record<StoryCategory, WidgetStory[] | null>> = {};
  for (const category of STORY_CATEGORIES) {
    const ids = idLists[category];
    if (ids === undefined) continue;
    result[category] = ids ? orderedWidgetStories(ids, items, limit) : null;
  }
  return result;
}

/**
 * Combines freshly fetched categories with the stored ones. A category that
 * failed (null) or came back empty keeps its previous stories, so one flaky list
 * never blanks part of the widget. Returns null when nothing fresh arrived, in
 * which case the stored timeline must stay untouched.
 */
export function mergeCategoryStories(
  fresh: Partial<Record<StoryCategory, WidgetStory[] | null>>,
  previous: WidgetStories
): WidgetStories | null {
  const merged: WidgetStories = {};
  let hasFresh = false;
  for (const category of STORY_CATEGORIES) {
    const next = fresh[category];
    const stored = previous[category];
    if (next && next.length > 0) {
      merged[category] = next;
      hasFresh = true;
    } else if (stored && stored.length > 0) {
      merged[category] = stored;
    }
  }
  return hasFresh ? merged : null;
}

/**
 * Reads the `stories` prop of a stored timeline. Before the category picker it was a
 * plain array of Top stories; that shape is migrated instead of discarded.
 */
export function readStoredStories(
  value: WidgetStories | WidgetStory[] | undefined
): WidgetStories {
  if (Array.isArray(value)) return { top: value };
  return value ?? {};
}

/**
 * Bookmarked stories for the widget, in bookmark order: a fresh copy when one was
 * fetched, else the previously stored copy (points and comments may be stale),
 * else the story is left out.
 */
export function mergeBookmarkStories(
  ids: number[],
  fresh: WidgetStory[],
  previous: WidgetStory[]
): WidgetStory[] {
  const freshById = new Map(fresh.map((story) => [story.id, story]));
  const previousById = new Map(previous.map((story) => [story.id, story]));
  return ids.flatMap((id) => {
    const story = freshById.get(id) ?? previousById.get(id);
    return story ? [story] : [];
  });
}

/**
 * Timeline entries spaced `spacingMs` apart, all with the same props. Entry dates are
 * the only scheduling primitive: future-dated entries let WidgetKit roll forward on
 * its own so relative ages stay right while the app is closed.
 */
export function buildTimelineEntries<P>(
  props: P,
  now: number,
  count: number,
  spacingMs: number
): { date: Date; props: P }[] {
  return Array.from({ length: count }, (_, i) => ({
    date: new Date(now + i * spacingMs),
    props,
  }));
}
