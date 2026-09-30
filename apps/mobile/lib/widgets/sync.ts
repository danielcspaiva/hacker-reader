import AsyncStorage from "@react-native-async-storage/async-storage";
import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import { widgetsDirectory } from "expo-widgets";
import { Platform } from "react-native";

import {
  getCategoryStoryIds,
  getItems,
  STORY_CATEGORIES,
  type HNItem,
  type StoryCategory,
} from "@/lib/hn";
import { getBookmarkIds } from "@/lib/hn/local/bookmarks";
import { reportError } from "@/lib/observability/report-error";
import HNBookmarksWidget, {
  type HNBookmarksProps,
} from "@/widgets/HNBookmarksWidget";
import HNTopStoriesWidget, {
  type HNTopStoriesProps,
} from "@/widgets/HNTopStoriesWidget";
import { widgetPalette } from "@/widgets/palette";
import contract from "@/widgets/widget-contract.json";

import {
  buildCategoryStories,
  buildTimelineEntries,
  mergeBookmarkStories,
  mergeCategoryStories,
  orderedWidgetStories,
  readStoredStories,
  type WidgetStory,
} from "./stories";

// Bump the name when the logo changes so the widget never reads a stale copy.
const LOGO_FILE = "widget-logo-v1.png";
const LAST_SYNC_KEY = "@hn/widgets/lastSync";
const BOOKMARKS_LAST_SYNC_KEY = "@hn/widgets/bookmarksLastSync";
const MIN_SYNC_INTERVAL_MS = 10 * 60 * 1000;
const ENTRY_SPACING_MS = contract.entrySpacingMinutes * 60 * 1000;

let lastSyncAt = 0;
let inFlight: Promise<void> | null = null;
let bookmarksLastSyncAt = 0;
let bookmarksInFlight: Promise<void> | null = null;
let bookmarksRerun = false;

async function readLastSync(key: string, memory: number): Promise<number> {
  if (memory) return memory;
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

/**
 * The widget extension can't read the app bundle, so the logo is copied once into
 * the widgets directory (shared App Group container) and handed to the widget as a file URI.
 */
async function ensureWidgetLogo(): Promise<string | undefined> {
  try {
    if (!widgetsDirectory) return undefined;
    const destination = new File(widgetsDirectory, LOGO_FILE);
    if (!destination.exists) {
      const asset = await Asset.fromModule(
        require("@/assets/images/widget-logo.png")
      ).downloadAsync();
      if (!asset.localUri) return undefined;
      new File(asset.localUri).copy(destination);
    }
    return destination.uri;
  } catch {
    return undefined;
  }
}

/**
 * Every category's first stories, or null when nothing could be fetched. The id lists
 * are fetched per category and the items once for all of them (Top and Best overlap).
 * A category whose list failed is null in the result.
 */
async function fetchCategoryStories(): Promise<ReturnType<
  typeof buildCategoryStories
> | null> {
  const lists = await Promise.all(
    STORY_CATEGORIES.map(async (category) => {
      try {
        return [
          category,
          await getCategoryStoryIds(category, 0, contract.candidateCount),
        ] as const;
      } catch {
        // Offline or HN unreachable for this list: keep its stored stories.
        return [category, null] as const;
      }
    })
  );
  const idLists: Partial<Record<StoryCategory, number[] | null>> =
    Object.fromEntries(lists);
  const ids = [...new Set(lists.flatMap(([, list]) => list ?? []))];
  if (ids.length === 0) return null;

  let items: HNItem[];
  try {
    items = await getItems(ids);
  } catch {
    return null;
  }
  return buildCategoryStories(idLists, items, contract.storyCount);
}

/** The props of the stored timeline's first entry, if any. */
async function readStoredProps<P extends object>(widget: {
  getTimeline(): Promise<{ props: P }[]>;
}): Promise<P | null> {
  try {
    return (await widget.getTimeline())[0]?.props ?? null;
  } catch {
    return null;
  }
}

async function runSync(): Promise<void> {
  const fresh = await fetchCategoryStories();
  if (!fresh) return;

  // A category that failed keeps the stories already stored; when nothing new
  // arrived at all the stored timeline stays as it is.
  const previous = await readStoredProps<HNTopStoriesProps>(HNTopStoriesWidget);
  const stories = mergeCategoryStories(
    fresh,
    previous?.isSample ? {} : readStoredStories(previous?.stories)
  );
  if (!stories) return;

  const now = Date.now();
  const props: HNTopStoriesProps = {
    stories,
    updatedAt: now,
    palette: widgetPalette,
    logoUri: await ensureWidgetLogo(),
  };
  HNTopStoriesWidget.updateTimeline(
    buildTimelineEntries(props, now, contract.entryCount, ENTRY_SPACING_MS)
  );

  lastSyncAt = now;
  try {
    await AsyncStorage.setItem(LAST_SYNC_KEY, String(now));
  } catch {
    // throttle falls back to the in-memory timestamp
  }
}

export function syncTopStoriesWidget(
  options: { force?: boolean } = {}
): Promise<void> {
  if (Platform.OS !== "ios") return Promise.resolve();
  // Claimed synchronously (before any await) so concurrent callers share one run.
  if (inFlight) return inFlight;

  inFlight = (async () => {
    if (!options.force) {
      const last = await readLastSync(LAST_SYNC_KEY, lastSyncAt);
      if (Date.now() - last < MIN_SYNC_INTERVAL_MS) return;
    }
    await runSync();
  })()
    .catch((error) => {
      // Network failures are handled in fetchCategoryStories; anything reaching here is unexpected.
      reportError(error, { operation: "syncTopStoriesWidget" });
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

async function runBookmarksSync(): Promise<void> {
  let ids: number[];
  try {
    ids = await getBookmarkIds();
  } catch {
    // Storage unreadable: never replace the stored list with an empty one.
    return;
  }
  const recent = ids.slice(0, contract.bookmarkCount);

  let fresh: WidgetStory[] = [];
  if (recent.length > 0) {
    try {
      fresh = orderedWidgetStories(
        recent,
        await getItems(recent),
        contract.bookmarkCount
      );
    } catch {
      // Offline: the stored copies (possibly stale points) fill in below.
    }
  }
  const previous = await readStoredProps<HNBookmarksProps>(HNBookmarksWidget);
  const stories = mergeBookmarkStories(
    recent,
    fresh,
    previous && !previous.isSample ? previous.stories : []
  );
  // Bookmarks exist but nothing is known about them (offline, first sync): keep
  // whatever the widget shows now.
  if (recent.length > 0 && stories.length === 0) return;

  const now = Date.now();
  const props: HNBookmarksProps = {
    stories,
    total: ids.length,
    updatedAt: now,
    palette: widgetPalette,
    logoUri: await ensureWidgetLogo(),
  };
  HNBookmarksWidget.updateTimeline(
    buildTimelineEntries(props, now, contract.entryCount, ENTRY_SPACING_MS)
  );

  bookmarksLastSyncAt = now;
  try {
    await AsyncStorage.setItem(BOOKMARKS_LAST_SYNC_KEY, String(now));
  } catch {
    // throttle falls back to the in-memory timestamp
  }
}

/**
 * Pushes the most recent bookmarks to the Bookmarks widget. Forced on every bookmark
 * change; a change that lands while a sync is running triggers one more run, so the
 * widget never ends on a stale list.
 */
export function syncBookmarksWidget(
  options: { force?: boolean } = {}
): Promise<void> {
  if (Platform.OS !== "ios") return Promise.resolve();
  if (bookmarksInFlight) {
    if (options.force) bookmarksRerun = true;
    return bookmarksInFlight;
  }

  bookmarksInFlight = (async () => {
    if (!options.force) {
      const last = await readLastSync(
        BOOKMARKS_LAST_SYNC_KEY,
        bookmarksLastSyncAt
      );
      if (Date.now() - last < MIN_SYNC_INTERVAL_MS) return;
    }
    do {
      bookmarksRerun = false;
      await runBookmarksSync();
    } while (bookmarksRerun);
  })()
    .catch((error) => {
      reportError(error, { operation: "syncBookmarksWidget" });
    })
    .finally(() => {
      bookmarksInFlight = null;
    });
  return bookmarksInFlight;
}
