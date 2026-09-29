import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, it } from "node:test";

const require = createRequire(import.meta.url);
const root = new URL("../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

const plugin: {
  applySelfRefresh: (widget: string, provider: string) => string;
} = require("../../plugins/with-widget-self-refresh.js");
const { applySelfRefresh } = plugin;
const contract: { timelineKeyFormat: string } = JSON.parse(
  read("widgets/widget-contract.json")
);

const MARKER = "// MARK: - HNSelfRefreshingProvider (generated, do not edit)";
const DEFAULT_TEMPLATE = `struct W: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: name, provider: WidgetsTimelineProvider(name: name)) { entry in }
  }
}
`;

describe("self-refresh plugin transform", () => {
  const provider = read("widgets/HNSelfRefreshingProvider.swift");

  it("matches the committed widget file", () => {
    const committed = read("ios/ExpoWidgetsTarget/HNTopStoriesWidget.swift");
    const template = committed.slice(0, committed.indexOf(MARKER)).trimEnd();
    const regenerated = applySelfRefresh(
      template.replace(
        "provider: HNSelfRefreshingProvider(name: name)",
        "provider: WidgetsTimelineProvider(name: name)"
      ),
      provider
    );
    assert.equal(
      committed,
      regenerated,
      "ios/ExpoWidgetsTarget/HNTopStoriesWidget.swift is stale: re-run the plugin transform"
    );
  });

  it("is idempotent", () => {
    const once = applySelfRefresh(DEFAULT_TEMPLATE, provider);
    assert.equal(applySelfRefresh(once, provider), once);
    assert.equal(once.split("enum HNWidgetContract").length, 2);
  });

  it("fails loudly when expo-widgets changes its template", () => {
    assert.throws(() => applySelfRefresh("struct W {}", provider), /template/);
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
});
