import WidgetKit
import SwiftUI
internal import ExpoWidgets

struct HNBookmarksWidget: Widget {
  let name: String = "HNBookmarksWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: name, provider: WidgetsTimelineProvider(name: name)) { entry in
      WidgetsEntryView(entry: entry)
    }
    .configurationDisplayName("HN Bookmarks")
    .description("Your most recent bookmarked stories")
    .supportedFamilies([.systemMedium, .systemLarge])
  }
}