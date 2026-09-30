import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, it } from "node:test";

import { STORY_CATEGORIES } from "@/lib/hn";

const require = createRequire(import.meta.url);
const root = new URL("../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

const plugin: {
  applySelfRefresh: (widget: string, provider: string) => string;
} = require("../../plugins/with-widget-self-refresh.js");
const { applySelfRefresh } = plugin;
const contract: { timelineKeyFormat: string; categories: string[] } =
  JSON.parse(read("widgets/widget-contract.json"));

type WidgetConfig = {
  widgets: {
    name: string;
    ios: {
      configuration: {
        parameters: { category: { values: { value: string }[] } };
      };
    };
  }[];
};
type AppJson = {
  expo: { plugins: (string | [string, WidgetConfig])[] };
};

const MARKER = "// MARK: - HNSelfRefreshingProvider (generated, do not edit)";
// The parts of expo-widgets' configured-widget template the plugin patches.
const DEFAULT_TEMPLATE = `@available(iOS 17.0, *)
struct HNTopStoriesWidgetConfigurationAppIntent: WidgetConfigurationIntent {
}
struct HNTopStoriesWidgetTimelineEntry: TimelineEntry {
}
struct HNTopStoriesWidgetTimelineProvider: AppIntentTimelineProvider {
  func timeline(for configuration: HNTopStoriesWidgetConfigurationAppIntent, in context: Context) async -> Timeline<HNTopStoriesWidgetTimelineEntry> {
    let entries = self.parseTimeline(configuration: configuration)
    let timeline = Timeline<HNTopStoriesWidgetTimelineEntry>(entries: entries, policy: .atEnd)
    return timeline
  }
}
struct HNTopStoriesWidgetEntryView: View {
}
`;

describe("self-refresh plugin transform", () => {
  const provider = read("widgets/HNSelfRefreshingProvider.swift");

  it("matches the committed widget file", () => {
    const committed = read("ios/ExpoWidgetsTarget/HNTopStoriesWidget.swift");
    const base = committed.slice(0, committed.indexOf(MARKER)).trimEnd();
    assert.equal(
      committed,
      applySelfRefresh(base, provider),
      "ios/ExpoWidgetsTarget/HNTopStoriesWidget.swift is stale: re-run expo prebuild"
    );
  });

  it("refreshes before the timeline and reloads on a schedule", () => {
    const out = applySelfRefresh(DEFAULT_TEMPLATE, provider);
    const refreshAt = out.indexOf(
      'await HNWidgetRefresher.refreshIfStale(name: "HNTopStoriesWidget")'
    );
    assert.ok(refreshAt > 0);
    assert.ok(refreshAt < out.indexOf("self.parseTimeline"));
    assert.ok(out.includes("HNWidgetContract.reloadAfter"));
    assert.ok(!out.includes("policy: .atEnd"));
  });

  it("marks the configuration types iOS 17 exactly once", () => {
    const out = applySelfRefresh(DEFAULT_TEMPLATE, provider);
    for (const type of [
      "HNTopStoriesWidgetConfigurationAppIntent: WidgetConfigurationIntent",
      "HNTopStoriesWidgetTimelineEntry: TimelineEntry",
      "HNTopStoriesWidgetTimelineProvider: AppIntentTimelineProvider",
      "HNTopStoriesWidgetEntryView: View",
    ]) {
      assert.ok(
        out.includes(`@available(iOS 17.0, *)\nstruct ${type}`),
        `${type} is not iOS 17 guarded`
      );
      assert.equal(out.split(`struct ${type}`).length, 2);
    }
    assert.equal(out.split("@available(iOS 17.0, *)").length, 5);
  });

  it("is idempotent", () => {
    const once = applySelfRefresh(DEFAULT_TEMPLATE, provider);
    assert.equal(applySelfRefresh(once, provider), once);
    assert.equal(once.split("enum HNWidgetContract").length, 2);
  });

  it("fails loudly when expo-widgets changes its template", () => {
    assert.throws(() => applySelfRefresh("struct W {}", provider), /template/);
  });

  it("leaves the Bookmarks widget on the stock provider", () => {
    const bookmarks = read("ios/ExpoWidgetsTarget/HNBookmarksWidget.swift");
    assert.ok(bookmarks.includes("WidgetsTimelineProvider(name: name)"));
    assert.ok(!bookmarks.includes("HNWidgetRefresher"));
  });
});

describe("widget contract", () => {
  it("uses the timeline key format expo-widgets reads", () => {
    const utils = readFileSync(
      new URL(
        "../../../../node_modules/expo-widgets/ios/Widgets/Utils.swift",
        import.meta.url
      ),
      "utf8"
    );
    const swiftKey = contract.timelineKeyFormat.replace("{name}", "\\(name)");
    assert.ok(
      utils.includes(`"${swiftKey}"`),
      `expo-widgets no longer uses ${contract.timelineKeyFormat}`
    );
  });

  it("lists the same categories as the app, the provider and app.json", () => {
    assert.deepEqual(contract.categories, [...STORY_CATEGORIES]);
    const provider = read("widgets/HNSelfRefreshingProvider.swift");
    for (const category of STORY_CATEGORIES) {
      assert.ok(
        provider.includes(`("${category}", "`),
        `provider has no ${category} endpoint`
      );
    }
    const app: AppJson = JSON.parse(read("app.json"));
    const config = app.expo.plugins
      .filter((plugin) => Array.isArray(plugin))
      .find((plugin) => plugin[0] === "expo-widgets")?.[1];
    assert.ok(config);
    const top = config.widgets.find(
      (widget) => widget.name === "HNTopStoriesWidget"
    );
    assert.deepEqual(
      top?.ios.configuration.parameters.category.values.map(
        (value) => value.value
      ),
      [...STORY_CATEGORIES]
    );
    assert.deepEqual(
      config.widgets.map((widget) => widget.name),
      ["HNTopStoriesWidget", "HNBookmarksWidget"]
    );
  });
});
