export const HN_WEB_URL = "https://news.ycombinator.com";
export const FIREBASE_URL = "https://hacker-news.firebaseio.com/v0";
export const ALGOLIA_URL = "https://hn.algolia.com/api/v1";
export const OG_USER_AGENT = "Mozilla/5.0 (compatible; HNClient/1.0)";
/** UA sent on authenticated news.ycombinator.com requests. */
export const HN_USER_AGENT = "HN-Client/1.0 (Mobile)";

/** Story list categories, in tab order. */
export const STORY_CATEGORIES = [
  "top",
  "best",
  "new",
  "ask",
  "show",
  "jobs",
] as const;
export type StoryCategory = (typeof STORY_CATEGORIES)[number];

/** The category named by `value` (a URL segment, a widget setting), or null. */
export function parseStoryCategory(
  value: string | undefined
): StoryCategory | null {
  return STORY_CATEGORIES.find((category) => category === value) ?? null;
}
