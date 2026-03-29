import WidgetKit
import SwiftUI

// MARK: - HNWidget
/// Main widget configuration for Hacker News Top Stories
@main
struct HNWidget: Widget {
    let kind: String = "HNTopStoriesWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: HNWidgetProvider()) { entry in
            if #available(iOS 17.0, *) {
                HNWidgetView(entry: entry)
                    .containerBackground(.fill.tertiary, for: .widget)
            } else {
                HNWidgetView(entry: entry)
            }
        }
        .configurationDisplayName("HN Top Stories")
        .description("View top stories from Hacker News")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// MARK: - Widget Preview
struct HNWidget_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            HNWidgetView(entry: HNWidgetEntry.sample())
                .previewContext(WidgetPreviewContext(family: .systemSmall))
                .previewDisplayName("Small")

            HNWidgetView(entry: HNWidgetEntry.sample())
                .previewContext(WidgetPreviewContext(family: .systemMedium))
                .previewDisplayName("Medium")

            HNWidgetView(entry: HNWidgetEntry.sample())
                .previewContext(WidgetPreviewContext(family: .systemLarge))
                .previewDisplayName("Large")
        }
    }
}
