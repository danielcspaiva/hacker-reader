import type { WidgetSize } from "@/lib/analytics/tracking";

export interface WidgetTap {
  size: WidgetSize;
  storyId: number;
}

const WIDGET_SIZES: readonly string[] = [
  "small",
  "medium",
  "large",
  "accessory",
] satisfies WidgetSize[];

function isWidgetSize(value: string): value is WidgetSize {
  return WIDGET_SIZES.includes(value);
}

/**
 * Parses the URL a widget story row opens
 * (`hnclient://story/{id}?source=widget&widgetSize={size}`, built in
 * widgets/HNTopStoriesWidget.tsx). Returns null for any other URL, including
 * widget taps without a story (the header opens `hnclient://`).
 */
export function parseWidgetTap(url: string): WidgetTap | null {
  const match = /^hnclient:\/\/story\/(\d+)\/?\?(.*)$/.exec(url);
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

  const size = params.get("widgetSize");
  if (params.get("source") !== "widget" || !size || !isWidgetSize(size)) {
    return null;
  }
  const storyId = Number(match[1]);
  return Number.isSafeInteger(storyId) ? { size, storyId } : null;
}
