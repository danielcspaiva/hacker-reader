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
