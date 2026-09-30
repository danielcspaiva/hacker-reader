// Lets the Top Stories widget fetch fresh stories on its own. The widget has a
// configuration (category picker), so expo-widgets generates
// ExpoWidgetsTarget/HNTopStoriesWidget.swift with an AppIntentTimelineProvider that only
// replays the timeline the app pushed. This patches that file: `timeline(for:in:)` first
// calls HNWidgetRefresher.refreshIfStale (widgets/HNSelfRefreshingProvider.swift, appended
// after an `HNWidgetContract` enum generated from widgets/widget-contract.json, the same
// file lib/widgets/sync.ts reads, so both sides share one set of numbers) and asks
// WidgetKit for a new timeline after `reloadAfter`. The configuration types are also
// marked iOS 17 (the extension targets 16.4, expo-widgets only guards the widget itself).
// Only HNTopStoriesWidget.swift is touched; the Bookmarks widget keeps the stock provider.
// Runs as a finalized mod so it edits the file after expo-widgets has written it.
const { withFinalizedMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const WIDGET_FILE = path.join("ExpoWidgetsTarget", "HNTopStoriesWidget.swift");
const PROVIDER_SOURCE = path.join("widgets", "HNSelfRefreshingProvider.swift");
const CONTRACT = require("../widgets/widget-contract.json");
const WIDGET_NAME = "HNTopStoriesWidget";
const REFRESH_CALL = `await HNWidgetRefresher.refreshIfStale(name: "${WIDGET_NAME}")`;
const RELOAD_POLICY =
  "policy: .after(Date().addingTimeInterval(HNWidgetContract.reloadAfter))";
// Declarations expo-widgets generates for a configured widget that need iOS 17.
const IOS_17_TYPES = [
  "ConfigurationAppIntent: WidgetConfigurationIntent",
  "TimelineEntry: TimelineEntry",
  "TimelineProvider: AppIntentTimelineProvider",
  "EntryView: View",
].map((suffix) => `struct ${WIDGET_NAME}${suffix}`);
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

function templateError(what) {
  return new Error(
    `with-widget-self-refresh: ${what} not found in ${WIDGET_FILE}; expo-widgets changed its template.`
  );
}

function patchTimeline(widgetSwift) {
  let patched = widgetSwift;

  if (!patched.includes(REFRESH_CALL)) {
    const pattern =
      /(func timeline\(for configuration: [^\n]*async -> [^\n]*\{\n)(\s*)(let entries = self\.parseTimeline\(configuration: configuration\))/;
    if (!pattern.test(patched)) throw templateError("`timeline(for:in:)`");
    patched = patched.replace(
      pattern,
      (_match, signature, indent, parse) =>
        `${signature}${indent}${REFRESH_CALL}\n${indent}${parse}`
    );
  }

  if (!patched.includes(RELOAD_POLICY)) {
    const occurrences = patched.split("policy: .atEnd)").length - 1;
    if (occurrences !== 1) throw templateError("the `.atEnd` timeline policy");
    patched = patched.replace("policy: .atEnd)", `${RELOAD_POLICY})`);
  }

  for (const declaration of IOS_17_TYPES) {
    if (!patched.includes(declaration)) throw templateError(declaration);
    if (!patched.includes(`@available(iOS 17.0, *)\n${declaration}`)) {
      patched = patched.replace(
        declaration,
        `@available(iOS 17.0, *)\n${declaration}`
      );
    }
  }
  return patched;
}

function applySelfRefresh(widgetSwift, providerSwift, contract = CONTRACT) {
  const markerAt = widgetSwift.indexOf(MARKER);
  const base = (
    markerAt >= 0 ? widgetSwift.slice(0, markerAt) : widgetSwift
  ).trimEnd();
  return `${patchTimeline(base)}\n\n${MARKER}\n\n${contractSwift(contract)}\n\n${providerSwift}`;
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
