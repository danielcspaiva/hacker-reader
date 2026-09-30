import type { WidgetSize } from "@/lib/analytics/tracking";
import { parseStoryCategory, type StoryCategory } from "@/lib/hn";

export type WidgetKind = "HNTopStoriesWidget" | "HNBookmarksWidget";

export interface WidgetTap {
  size: WidgetSize;
  /** Which widget was tapped, when the URL names a known one. */
  kind?: WidgetKind;
  /** The category the Top Stories widget was showing. */
  category?: StoryCategory;
  /** Set when a story row was tapped; absent for header and background taps. */
  storyId?: number;
}

const WIDGET_SIZES = [
  "small",
  "medium",
  "large",
  "accessory",
] as const satisfies readonly WidgetSize[];

const WIDGET_KINDS = [
  "HNTopStoriesWidget",
  "HNBookmarksWidget",
] as const satisfies readonly WidgetKind[];

/**
 * Parses the URLs widgets open, built in widgets/HNTopStoriesWidget.tsx and
 * widgets/HNBookmarksWidget.tsx:
 * - `hnclient://story/{id}?source=widget&widgetKind=..&category=..&widgetSize=..` (a story row)
 * - `hnclient://feed/{category}?source=widget&...` (Top Stories header / background)
 * - `hnclient://bookmarks?source=widget&...` (Bookmarks header / background)
 * Returns null for any other URL, including the plain `hnclient://` a widget used to open.
 */
export function parseWidgetTap(url: string): WidgetTap | null {
  const match =
    /^hnclient:\/\/(story\/\d+|feed\/[a-z]+|bookmarks)\/?\?(.*)$/.exec(url);
  if (!match) return null;

  const params = new Map<string, string>();
  for (const pair of match[2].split("&")) {
    const [key, value = ""] = pair.split("=");
    try {
      params.set(decodeURIComponent(key), decodeURIComponent(value));
    } catch {
      // A malformed escape only loses that one parameter.
    }
  }

  const size = WIDGET_SIZES.find((value) => value === params.get("widgetSize"));
  if (params.get("source") !== "widget" || !size) return null;

  const tap: WidgetTap = { size };
  const kind = WIDGET_KINDS.find((value) => value === params.get("widgetKind"));
  if (kind) tap.kind = kind;

  const [target, id] = match[1].split("/");
  let category = params.get("category") ?? undefined;
  if (target === "story") {
    const storyId = Number(id);
    if (!Number.isSafeInteger(storyId)) return null;
    tap.storyId = storyId;
  } else if (target === "feed") {
    category = id;
  }
  const parsedCategory = parseStoryCategory(category);
  if (parsedCategory) tap.category = parsedCategory;
  return tap;
}
