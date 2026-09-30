import type { StoryCategory } from "@/lib/hn";

export const CATEGORY_LABELS: Record<StoryCategory, string> = {
  top: "Top",
  new: "New",
  ask: "Ask",
  show: "Show",
  jobs: "Jobs",
};

/** Accessible page title of the feed screen, read by VoiceOver. */
export const CATEGORY_TITLES: Record<StoryCategory, string> = {
  top: "Top Stories",
  new: "New Stories",
  ask: "Ask HN",
  show: "Show HN",
  jobs: "Jobs",
};
