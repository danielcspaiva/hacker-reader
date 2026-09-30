import WidgetKit
import SwiftUI
internal import ExpoWidgets

struct HNTopStoriesWidget: Widget {
  let name: String = "HNTopStoriesWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: name, provider: HNSelfRefreshingProvider(name: name)) { entry in
      WidgetsEntryView(entry: entry)
    }
    .configurationDisplayName("HN Top Stories")
    .description("View top stories from Hacker News")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular])
  }
}

// MARK: - HNSelfRefreshingProvider (generated, do not edit)

enum HNWidgetContract {
  static let storyCount = 8
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
// enum built from widgets/widget-contract.json. expo-widgets' provider only replays the
// timeline the app pushed; this wrapper lets the widget refresh on its own when iOS asks
// for a new timeline and the stored stories are stale.

/// Mirrors lib/widgets/sync.ts: same story count, entry spacing and props shape,
/// written to the same App Group key expo-widgets reads. Numbers come from the contract.
struct HNSelfRefreshingProvider: TimelineProvider {
  typealias Entry = WidgetsTimelineEntry

  let name: String

  private static let apiBase = "https://hacker-news.firebaseio.com/v0"

  /// A dedicated session with a hard resource timeout keeps a slow network from
  /// eating the widget extension's short time budget.
  private static let session: URLSession = {
    let configuration = URLSessionConfiguration.ephemeral
    configuration.timeoutIntervalForRequest = 8
    configuration.timeoutIntervalForResource = 8
    return URLSession(configuration: configuration)
  }()

  private var inner: WidgetsTimelineProvider { WidgetsTimelineProvider(name: name) }

  func placeholder(in context: Context) -> Entry {
    inner.placeholder(in: context)
  }

  func getSnapshot(in context: Context, completion: @escaping @Sendable (Entry) -> Void) {
    inner.getSnapshot(in: context, completion: completion)
  }

  func getTimeline(in context: Context, completion: @escaping @Sendable (Timeline<Entry>) -> Void) {
    let name = name
    Task {
      await Self.refreshIfStale(name: name)
      WidgetsTimelineProvider(name: name).getTimeline(in: context) { timeline in
        // expo-widgets returns `.atEnd`; asking again after `reloadAfter` is what lets
        // the widget come back for fresh stories without the app running.
        completion(
          Timeline(
            entries: timeline.entries,
            policy: .after(Date().addingTimeInterval(HNWidgetContract.reloadAfter))
          )
        )
      }
    }
  }

  // MARK: - Refresh

  private struct Item: Decodable {
    let id: Int
    let title: String?
    let score: Int?
    let by: String?
    let time: Int?
    let descendants: Int?
    let url: String?
    let deleted: Bool?
    let dead: Bool?
  }

  private static func refreshIfStale(name: String) async {
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
    guard age >= HNWidgetContract.staleAfter, let stories = await fetchTopStories(), !stories.isEmpty else { return }

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

  private static func fetchTopStories() async -> [[String: Any]]? {
    guard let ids: [Int] = await fetch("\(apiBase)/topstories.json") else { return nil }
    let candidates = Array(ids.prefix(HNWidgetContract.candidateCount))

    let items = await withTaskGroup(of: Item?.self) { group in
      for id in candidates {
        group.addTask { await fetch("\(apiBase)/item/\(id).json") }
      }
      var byId: [Int: Item] = [:]
      for await item in group {
        if let item { byId[item.id] = item }
      }
      return byId
    }

    // Keep HN ranking order; drop failed fetches and deleted/dead/untitled items.
    return candidates
      .compactMap { items[$0] }
      .filter { $0.deleted != true && $0.dead != true && $0.title != nil }
      .prefix(HNWidgetContract.storyCount)
      .map(storyProps)
  }

  private static func storyProps(_ item: Item) -> [String: Any] {
    var story: [String: Any] = [
      "id": item.id,
      "title": item.title ?? "",
      "score": item.score ?? 0,
      "by": item.by ?? "",
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
