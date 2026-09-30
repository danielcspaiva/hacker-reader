import AsyncStorage from "@react-native-async-storage/async-storage";
import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import { widgetsDirectory } from "expo-widgets";
import { Platform } from "react-native";

import { getDomain } from "@/lib/format/url";
import { getCategoryStoryIds, getItems, type HNItem } from "@/lib/hn";
import { reportError } from "@/lib/observability/report-error";
import HNTopStoriesWidget, {
  type HNTopStoriesProps,
  type WidgetStory,
} from "@/widgets/HNTopStoriesWidget";
import { widgetPalette } from "@/widgets/palette";
import contract from "@/widgets/widget-contract.json";

// Bump the name when the logo changes so the widget never reads a stale copy.
const LOGO_FILE = "widget-logo-v1.png";
const LAST_SYNC_KEY = "@hn/widgets/lastSync";
const MIN_SYNC_INTERVAL_MS = 10 * 60 * 1000;
const ENTRY_SPACING_MS = contract.entrySpacingMinutes * 60 * 1000;

let lastSyncAt = 0;
let inFlight: Promise<void> | null = null;

function toWidgetStory(item: HNItem): WidgetStory | null {
  if (item.deleted || item.dead || !item.title) return null;
  return {
    id: item.id,
    title: item.title,
    score: item.score ?? 0,
    by: item.by ?? "",
    time: item.time ?? 0,
    comments: item.descendants ?? 0,
    domain: getDomain(item.url) ?? undefined,
  };
}

async function readLastSync(): Promise<number> {
  if (lastSyncAt) return lastSyncAt;
  try {
    const raw = await AsyncStorage.getItem(LAST_SYNC_KEY);
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

/** The top stories in HN order, or null when the network is unreachable. */
async function fetchTopStories(): Promise<WidgetStory[] | null> {
  let ids: number[];
  let items: HNItem[];
  try {
    ids = await getCategoryStoryIds("top", 0, contract.candidateCount);
    items = await getItems(ids);
  } catch {
    // Offline or HN unreachable: leave the stored timeline as it is.
    return null;
  }
  const byId = new Map(items.map((item) => [item.id, item]));
  // Preserve HN ranking order; getItems drops failed fetches.
  return ids
    .map((id) => byId.get(id))
    .filter((item): item is HNItem => item != null)
    .map(toWidgetStory)
    .filter((story): story is WidgetStory => story != null)
    .slice(0, contract.storyCount);
}

async function runSync(): Promise<void> {
  const stories = await fetchTopStories();
  if (!stories) return;

  // Never overwrite the last good timeline with an empty list.
  if (stories.length === 0) return;

  const now = Date.now();
  const props: HNTopStoriesProps = {
    stories,
    updatedAt: now,
    palette: widgetPalette,
    logoUri: await ensureWidgetLogo(),
  };
  // Entry dates are the only scheduling primitive: future-dated entries let WidgetKit
  // roll forward on its own so relative ages stay right while the app is closed.
  const entries = Array.from({ length: contract.entryCount }, (_, i) => ({
    date: new Date(now + i * ENTRY_SPACING_MS),
    props,
  }));
  HNTopStoriesWidget.updateTimeline(entries);

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
      const last = await readLastSync();
      if (Date.now() - last < MIN_SYNC_INTERVAL_MS) return;
    }
    await runSync();
  })()
    .catch((error) => {
      // Network failures are handled in fetchTopStories; anything reaching here is unexpected.
      reportError(error, { operation: "syncTopStoriesWidget" });
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
