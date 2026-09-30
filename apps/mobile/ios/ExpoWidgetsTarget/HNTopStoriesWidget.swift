import WidgetKit
import SwiftUI
import AppIntents
internal import ExpoWidgets

// AppIntent
@available(iOS 17.0, *)
struct HNTopStoriesWidgetConfigurationAppIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "Stories Configuration"
  static var description: LocalizedStringResource = "Choose which Hacker News stories to show"

  @Parameter(title: "Category", default: HNTopStoriesWidgetCategoryEnum.top)
  var category: HNTopStoriesWidgetCategoryEnum

  func perform() async throws -> some IntentResult {
    return .result()
  }
}

enum HNTopStoriesWidgetCategoryEnum: String, CaseIterable, AppEnum {
  case top
  case best
  case new
  case ask
  case show
  case jobs

  static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Category")

  static var caseDisplayRepresentations: [HNTopStoriesWidgetCategoryEnum: DisplayRepresentation] = [
    .top: DisplayRepresentation(title: "Top"),
    .best: DisplayRepresentation(title: "Best"),
    .new: DisplayRepresentation(title: "New"),
    .ask: DisplayRepresentation(title: "Ask HN"),
    .show: DisplayRepresentation(title: "Show HN"),
    .jobs: DisplayRepresentation(title: "Jobs")
  ]
}

@available(iOS 17.0, *)
struct HNTopStoriesWidgetTimelineEntry: TimelineEntry {
  let date: Date
  public let name: String
  public let props: [String: Any]?
  public let entryIndex: Int?
  let configuration: HNTopStoriesWidgetConfigurationAppIntent
}

@available(iOS 17.0, *)
struct HNTopStoriesWidgetTimelineProvider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> HNTopStoriesWidgetTimelineEntry {
    HNTopStoriesWidgetTimelineEntry(date: Date(), name: "HNTopStoriesWidget", props: WidgetsLayoutRegistry.initialProps(for: "HNTopStoriesWidget"), entryIndex: nil, configuration: HNTopStoriesWidgetConfigurationAppIntent())
  }

  func snapshot(for configuration: HNTopStoriesWidgetConfigurationAppIntent, in context: Context) async -> HNTopStoriesWidgetTimelineEntry {
    let entries = parseTimeline(configuration: configuration)
    return entries.first ?? HNTopStoriesWidgetTimelineEntry(date: Date(), name: "HNTopStoriesWidget", props: WidgetsLayoutRegistry.initialProps(for: "HNTopStoriesWidget"), entryIndex: nil, configuration: configuration)
  }

  func timeline(for configuration: HNTopStoriesWidgetConfigurationAppIntent, in context: Context) async -> Timeline<HNTopStoriesWidgetTimelineEntry> {
    await HNWidgetRefresher.refreshIfStale(name: "HNTopStoriesWidget")
    let entries = self.parseTimeline(configuration: configuration)
    let timeline = Timeline<HNTopStoriesWidgetTimelineEntry>(entries: entries, policy: .after(Date().addingTimeInterval(HNWidgetContract.reloadAfter)))
    return timeline
  }
  
  func parseTimeline(configuration: HNTopStoriesWidgetConfigurationAppIntent) -> [HNTopStoriesWidgetTimelineEntry] {
    guard let timeline = WidgetsStorage.getArray(forKey: "__expo_widgets_HNTopStoriesWidget_timeline") else {
      return [HNTopStoriesWidgetTimelineEntry(date: Date(), name: "HNTopStoriesWidget", props: WidgetsLayoutRegistry.initialProps(for: "HNTopStoriesWidget"), entryIndex: nil, configuration: configuration)]
    }
    let entries: [HNTopStoriesWidgetTimelineEntry?] = timeline.enumerated().map { index, entry in
      guard let entry = entry as? [String: Any], let timestamp = entry["timestamp"] as? Int, let props = entry["props"] as? [String: Any] else {
        return nil
      }
      return HNTopStoriesWidgetTimelineEntry(
        date: Date(timeIntervalSince1970: Double(timestamp) / 1000),
        name: "HNTopStoriesWidget",
        props: props,
        entryIndex: index,
        configuration: configuration
      )
    }

    return entries.compactMap(\.self)
  }
}

@available(iOS 17.0, *)
struct HNTopStoriesWidgetEntryView: View {
  @Environment(\.self) var environment
  var entry: HNTopStoriesWidgetTimelineProvider.Entry

  init(entry: HNTopStoriesWidgetTimelineProvider.Entry) {
    self.entry = entry
  }

  private var widgetEnvironment: [String: Any] {
    var env: [String: Any] = getWidgetEnvironment(environment: environment)
    env["timestamp"] = Int(entry.date.timeIntervalSince1970 * 1000)
    env["configuration"] = [
        "category": entry.configuration.category.rawValue
    ]
    return env
  }

  private var widgetEnvironmentString: String? {
    guard let data = try? JSONSerialization.data(withJSONObject: widgetEnvironment),
          let jsonString = String(data: data, encoding: .utf8) else {
        return nil
    }
    return jsonString
  }

  public var body: some View {
    if let layout = WidgetsLayoutRegistry.layout(for: entry.name) {
      let node = evaluateLayout(layout: layout, props: entry.props, environment: widgetEnvironment)
      WidgetsDynamicView(name: entry.name, kind: .widget, node: node, entryIndex: entry.entryIndex, environmentString: widgetEnvironmentString)
    } else {
      WidgetsDynamicView(name: entry.name, kind: .widget, node: createRedBox(message: "No layout found for \(WidgetsStorage.appGroupIdentifier ?? "")::\(entry.name)"), entryIndex: entry.entryIndex, environmentString: widgetEnvironmentString)
    }
  }
}


@available(iOS 17.0, *)
struct HNTopStoriesWidget: Widget {
  let name: String = "HNTopStoriesWidget"

  var body: some WidgetConfiguration {
    return AppIntentConfiguration(kind: name, intent: HNTopStoriesWidgetConfigurationAppIntent.self, provider: HNTopStoriesWidgetTimelineProvider()) { entry in
      HNTopStoriesWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("HN Stories")
    .description("View stories from Hacker News")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular])
  }
}

// MARK: - HNSelfRefreshingProvider (generated, do not edit)

enum HNWidgetContract {
  static let storyCount = 7
  static let candidateCount = 10
  static let entryCount = 24
  /// Gap between the timeline entries pushed to the widget.
  static let entrySpacing: TimeInterval = 1800
  /// Stored stories older than this are refetched when the widget asks for a timeline.
  static let staleAfter: TimeInterval = 1800
  /// How long until WidgetKit is asked for a new timeline.
  static let reloadAfter: TimeInterval = 1800

  static func timelineKey(name: String) -> String { "__expo_widgets_\(name)_timeline" }
}

// Not standalone: compiled inside the generated ExpoWidgetsTarget/HNTopStoriesWidget.swift,
// which plugins/with-widget-self-refresh.js appends this to after an `HNWidgetContract`
// enum built from widgets/widget-contract.json. The widget is configurable (category
// picker), so expo-widgets generates an AppIntentTimelineProvider that only replays the
// timeline the app pushed; the plugin makes its `timeline(for:in:)` call
// `HNWidgetRefresher.refreshIfStale` first and ask for a new timeline after `reloadAfter`,
// so the widget refreshes on its own when iOS asks and the stored stories are stale.

/// Mirrors lib/widgets/sync.ts: same categories, story count, entry spacing and props
/// shape (`stories` keyed by category), written to the same App Group key expo-widgets
/// reads. Numbers come from the contract.
enum HNWidgetRefresher {
  private static let apiBase = "https://hacker-news.firebaseio.com/v0"

  /// Category id (what the widget configuration and the props use) -> Firebase list.
  private static let endpoints: [(category: String, path: String)] = [
    ("top", "topstories"),
    ("best", "beststories"),
    ("new", "newstories"),
    ("ask", "askstories"),
    ("show", "showstories"),
    ("jobs", "jobstories"),
  ]

  /// A dedicated session with a hard resource timeout keeps a slow network from
  /// eating the widget extension's short time budget.
  private static let session: URLSession = {
    let configuration = URLSessionConfiguration.ephemeral
    configuration.timeoutIntervalForRequest = 8
    configuration.timeoutIntervalForResource = 8
    return URLSession(configuration: configuration)
  }()

  private struct Item: Decodable {
    let id: Int
    let title: String?
    let score: Int?
    let time: Int?
    let descendants: Int?
    let url: String?
    let deleted: Bool?
    let dead: Bool?
  }

  /// Refetches every category when the stored timeline is older than `staleAfter`.
  /// Anything that fails leaves the stored timeline (or that category) as it was.
  static func refreshIfStale(name: String) async {
    guard
      let group = Bundle.main.object(forInfoDictionaryKey: "ExpoWidgetsAppGroupIdentifier") as? String,
      let defaults = UserDefaults(suiteName: group)
    else { return }

    let key = HNWidgetContract.timelineKey(name: name)
    let stored = defaults.array(forKey: key) as? [[String: Any]] ?? []
    // Before the app has ever pushed a timeline, fall back to the layout's initial props
    // so the palette is present and the logo falls back to the built-in mark.
    let previousProps =
      stored.first?["props"] as? [String: Any]
      ?? WidgetsLayoutRegistry.initialProps(for: name)
      ?? [:]
    let updatedAtMs = (previousProps["updatedAt"] as? NSNumber)?.doubleValue ?? 0
    let age = Date().timeIntervalSince1970 - updatedAtMs / 1000
    guard age >= HNWidgetContract.staleAfter, let fresh = await fetchCategories() else { return }

    // A category that came back empty keeps its stored stories. Sample stories (the
    // layout's initial props) are placeholders and never kept; `stories` used to be a
    // plain array of Top stories.
    var stories: [String: Any] = [:]
    if (previousProps["isSample"] as? Bool) != true {
      if let byCategory = previousProps["stories"] as? [String: Any] {
        stories = byCategory
      } else if let legacyTop = previousProps["stories"] as? [[String: Any]] {
        stories = ["top": legacyTop]
      }
    }
    var hasFresh = false
    for (category, list) in fresh where !list.isEmpty {
      stories[category] = list
      hasFresh = true
    }
    guard hasFresh else { return }

    let nowMs = Date().timeIntervalSince1970 * 1000
    var props = previousProps
    props["stories"] = stories
    props["updatedAt"] = nowMs
    props["isSample"] = false
    let entries: [[String: Any]] = (0..<HNWidgetContract.entryCount).map { index in
      ["timestamp": Int(nowMs + Double(index) * HNWidgetContract.entrySpacing * 1000), "props": props]
    }
    defaults.set(entries, forKey: key)
  }

  /// Stories per category, or nil when no list could be fetched at all. Id lists are
  /// fetched per category and the items once for all of them (Top and Best overlap).
  private static func fetchCategories() async -> [String: [[String: Any]]]? {
    let lists = await withTaskGroup(of: (String, [Int]?).self) { group in
      for endpoint in endpoints {
        group.addTask {
          let ids: [Int]? = await fetch("\(apiBase)/\(endpoint.path).json")
          return (endpoint.category, ids)
        }
      }
      var byCategory: [String: [Int]] = [:]
      for await (category, ids) in group {
        if let ids { byCategory[category] = Array(ids.prefix(HNWidgetContract.candidateCount)) }
      }
      return byCategory
    }
    guard !lists.isEmpty else { return nil }

    let uniqueIds = Set(lists.values.flatMap { $0 })
    let items = await withTaskGroup(of: Item?.self) { group in
      for id in uniqueIds {
        group.addTask { await fetch("\(apiBase)/item/\(id).json") }
      }
      var byId: [Int: Item] = [:]
      for await item in group {
        if let item { byId[item.id] = item }
      }
      return byId
    }
    guard !items.isEmpty else { return nil }

    // Keep HN ranking order; drop failed fetches and deleted/dead/untitled items.
    return lists.mapValues { ids in
      ids
        .compactMap { items[$0] }
        .filter { $0.deleted != true && $0.dead != true && $0.title != nil }
        .prefix(HNWidgetContract.storyCount)
        .map(storyProps)
    }
  }

  private static func storyProps(_ item: Item) -> [String: Any] {
    var story: [String: Any] = [
      "id": item.id,
      "title": item.title ?? "",
      "score": item.score ?? 0,
      "time": item.time ?? 0,
      "comments": item.descendants ?? 0,
    ]
    // Property lists can't hold nil: only set the domain when there is one.
    if let host = item.url.flatMap(URL.init(string:))?.host {
      story["domain"] = host.hasPrefix("www.") ? String(host.dropFirst(4)) : host
    }
    return story
  }

  private static func fetch<T: Decodable>(_ address: String) async -> T? {
    guard let url = URL(string: address) else { return nil }
    let request = URLRequest(url: url)
    guard
      let (data, response) = try? await session.data(for: request),
      (response as? HTTPURLResponse)?.statusCode == 200
    else { return nil }
    return try? JSONDecoder().decode(T.self, from: data)
  }
}
