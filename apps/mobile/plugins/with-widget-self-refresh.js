// Lets the home screen widget fetch fresh stories on its own. expo-widgets generates
// ExpoWidgetsTarget/HNTopStoriesWidget.swift with a provider that only replays the
// timeline the app pushed; this swaps in widgets/HNSelfRefreshingProvider.swift and
// prepends an `HNWidgetContract` enum generated from widgets/widget-contract.json,
// the same file lib/widgets/sync.ts reads, so both sides share one set of numbers.
// Runs as a finalized mod so it edits the file after expo-widgets has written it.
const { withFinalizedMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const WIDGET_FILE = path.join("ExpoWidgetsTarget", "HNTopStoriesWidget.swift");
const PROVIDER_SOURCE = path.join("widgets", "HNSelfRefreshingProvider.swift");
const CONTRACT = require("../widgets/widget-contract.json");
const DEFAULT_PROVIDER = "provider: WidgetsTimelineProvider(name: name)";
const SELF_REFRESHING_PROVIDER =
  "provider: HNSelfRefreshingProvider(name: name)";
// Everything from this line down is generated; a re-run strips it and appends again.
const MARKER = "// MARK: - HNSelfRefreshingProvider (generated, do not edit)";

function contractSwift(contract) {
  const seconds = (minutes) => minutes * 60;
  const timelineKey = contract.timelineKeyFormat.replace("{name}", "\\(name)");
  return `enum HNWidgetContract {
  static let storyCount = ${contract.storyCount}
  static let candidateCount = ${contract.candidateCount}
  static let entryCount = ${contract.entryCount}
  /// Gap between the timeline entries pushed to the widget.
  static let entrySpacing: TimeInterval = ${seconds(contract.entrySpacingMinutes)}
  /// Stored stories older than this are refetched when the widget asks for a timeline.
  static let staleAfter: TimeInterval = ${seconds(contract.staleAfterMinutes)}
  /// How long until WidgetKit is asked for a new timeline.
  static let reloadAfter: TimeInterval = ${seconds(contract.reloadAfterMinutes)}

  static func timelineKey(name: String) -> String { "${timelineKey}" }
}`;
}

function applySelfRefresh(widgetSwift, providerSwift, contract = CONTRACT) {
  const markerAt = widgetSwift.indexOf(MARKER);
  const base = (
    markerAt >= 0 ? widgetSwift.slice(0, markerAt) : widgetSwift
  ).trimEnd();
  const swapped = base.includes(SELF_REFRESHING_PROVIDER)
    ? base
    : base.replace(DEFAULT_PROVIDER, SELF_REFRESHING_PROVIDER);
  if (!swapped.includes(SELF_REFRESHING_PROVIDER)) {
    throw new Error(
      `with-widget-self-refresh: "${DEFAULT_PROVIDER}" not found in ${WIDGET_FILE}; expo-widgets changed its template.`
    );
  }
  return `${swapped}\n\n${MARKER}\n\n${contractSwift(contract)}\n\n${providerSwift}`;
}

function withWidgetSelfRefresh(config) {
  return withFinalizedMod(config, [
    "ios",
    (config) => {
      const { platformProjectRoot, projectRoot } = config.modRequest;
      const widgetPath = path.join(platformProjectRoot, WIDGET_FILE);
      const providerSwift = fs.readFileSync(
        path.join(projectRoot, PROVIDER_SOURCE),
        "utf8"
      );
      const widgetSwift = fs.readFileSync(widgetPath, "utf8");
      fs.writeFileSync(
        widgetPath,
        applySelfRefresh(widgetSwift, providerSwift)
      );
      return config;
    },
  ]);
}

module.exports = withWidgetSelfRefresh;
module.exports.applySelfRefresh = applySelfRefresh;
