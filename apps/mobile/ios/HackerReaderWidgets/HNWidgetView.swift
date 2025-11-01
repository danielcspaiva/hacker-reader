import WidgetKit
import SwiftUI

// MARK: - Theme Colors
/// HN theme colors matching apps/mobile/constants/theme.ts
extension Color {
    static let hnOrange = Color(hex: "ff6600")
    static let lightText = Color.black
    static let lightBackground = Color.white
    static let lightBorder = Color(hex: "e0e0e0")
    static let darkText = Color.white
    static let darkBackground = Color.black
    static let darkBorder = Color(hex: "1a1a1a")

    /// Initialize Color from hex string
    init(hex: String) {
        let scanner = Scanner(string: hex)
        var rgbValue: UInt64 = 0
        scanner.scanHexInt64(&rgbValue)

        let r = Double((rgbValue & 0xFF0000) >> 16) / 255.0
        let g = Double((rgbValue & 0x00FF00) >> 8) / 255.0
        let b = Double(rgbValue & 0x0000FF) / 255.0

        self.init(red: r, green: g, blue: b)
    }
}

// MARK: - Widget Styling Helpers
extension View {
    @ViewBuilder
    func widgetSurfaceBackground(_ color: Color) -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            self
                .containerBackground(color, for: .widget)
        } else {
            self
                .background(color)
        }
    }
}

// MARK: - Layout Constants
enum WidgetLayout {
    static let horizontalPaddingSmall: CGFloat = 5
    static let horizontalPaddingMedium: CGFloat = 6
    static let horizontalPaddingLarge: CGFloat = 8

    static let verticalPaddingTight: CGFloat = 4
    static let verticalPaddingRegular: CGFloat = 6

    static let rowSpacingTight: CGFloat = 3
    static let rowSpacingRegular: CGFloat = 4
}

// MARK: - Shared Subviews
struct WidgetHeaderView: View {
    let textColor: Color
    let iconSize: CGFloat
    let fontSize: CGFloat

    var body: some View {
        HStack(spacing: 5) {
            Image(systemName: "flame.fill")
                .font(.system(size: iconSize, weight: .semibold))
                .foregroundColor(.hnOrange)

            Text("Top Stories")
                .font(.system(size: fontSize, weight: .semibold))
                .foregroundColor(textColor)
                .lineLimit(1)
                .truncationMode(.tail)

            Spacer(minLength: 0)
        }
    }
}

struct CompactStoryRow: View {
    let story: HNStory
    let textColor: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(story.title)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(textColor)
                .lineLimit(2)
                .multilineTextAlignment(.leading)

            HStack(spacing: 4) {
                Image(systemName: "arrow.up")
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundColor(.hnOrange)
                Text("\(story.score)")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(.hnOrange)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct DetailedStoryRow: View {
    let story: HNStory
    let textColor: Color
    let secondaryTextColor: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(story.title)
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(textColor)
                .lineLimit(2)
                .multilineTextAlignment(.leading)

            HStack(spacing: 6) {
                HStack(spacing: 3) {
                    Image(systemName: "arrow.up")
                        .font(.system(size: 9, weight: .semibold))
                    Text("\(story.score)")
                        .font(.system(size: 11, weight: .semibold))
                }
                .foregroundColor(.hnOrange)

                Text("•")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(secondaryTextColor)

                HStack(spacing: 3) {
                    Image(systemName: "person.fill")
                    Text(story.by)
                        .lineLimit(1)
                        .truncationMode(.tail)
                }
                .font(.system(size: 11))
                .foregroundColor(secondaryTextColor)

                Spacer(minLength: 0)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct ExtendedStoryRow: View {
    let story: HNStory
    let textColor: Color
    let secondaryTextColor: Color
    let timeAgo: String

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(story.title)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(textColor)
                .lineLimit(2)
                .multilineTextAlignment(.leading)

            HStack(spacing: 6) {
                HStack(spacing: 3) {
                    Image(systemName: "arrow.up")
                    Text("\(story.score)")
                }
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(.hnOrange)

                Text("•")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(secondaryTextColor)

                HStack(spacing: 3) {
                    Image(systemName: "person.fill")
                    Text(story.by)
                        .lineLimit(1)
                        .truncationMode(.tail)
                }
                .font(.system(size: 11))
                .foregroundColor(secondaryTextColor)

                Text("•")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(secondaryTextColor)

                HStack(spacing: 3) {
                    Image(systemName: "clock.fill")
                    Text(timeAgo)
                }
                .font(.system(size: 11))
                .foregroundColor(secondaryTextColor)

                Spacer(minLength: 0)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - HNWidgetView
/// Main widget view that adapts to different widget families
struct HNWidgetView: View {
    @Environment(\.widgetFamily) var family
    @Environment(\.colorScheme) var colorScheme
    var entry: HNWidgetEntry

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        case .systemLarge:
            LargeWidgetView(entry: entry)
        default:
            MediumWidgetView(entry: entry)
        }
    }
}

// MARK: - Small Widget View
/// Shows top 3 stories in compact format
struct SmallWidgetView: View {
    @Environment(\.colorScheme) var colorScheme
    var entry: HNWidgetEntry

    var backgroundColor: Color {
        colorScheme == .dark ? .darkBackground : .lightBackground
    }

    var textColor: Color {
        colorScheme == .dark ? .darkText : .lightText
    }

    var body: some View {
        VStack(alignment: .leading, spacing: WidgetLayout.rowSpacingRegular) {
            WidgetHeaderView(textColor: textColor, iconSize: 15, fontSize: 13)

            Divider()
                .background(colorScheme == .dark ? Color.darkBorder : Color.lightBorder)

            VStack(alignment: .leading, spacing: WidgetLayout.rowSpacingTight) {
                ForEach(Array(entry.stories.prefix(3))) { story in
                    CompactStoryRow(story: story, textColor: textColor)

                    if story.id != entry.stories.prefix(3).last?.id {
                        Divider()
                            .background(colorScheme == .dark ? Color.darkBorder : Color.lightBorder)
                    }
                }
            }

            Spacer(minLength: 0)
        }
        .padding(.vertical, WidgetLayout.verticalPaddingTight)
        .padding(.horizontal, WidgetLayout.horizontalPaddingSmall)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetSurfaceBackground(backgroundColor)
        .widgetURL(URL(string: "hnclient://"))
    }
}

// MARK: - Medium Widget View
/// Shows 3 stories with more details
struct MediumWidgetView: View {
    @Environment(\.colorScheme) var colorScheme
    var entry: HNWidgetEntry

    var backgroundColor: Color {
        colorScheme == .dark ? .darkBackground : .lightBackground
    }

    var textColor: Color {
        colorScheme == .dark ? .darkText : .lightText
    }

    var secondaryTextColor: Color {
        colorScheme == .dark ? Color.gray : Color(white: 0.4)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: WidgetLayout.rowSpacingRegular) {
            WidgetHeaderView(textColor: textColor, iconSize: 16, fontSize: 15)

            Divider()
                .background(colorScheme == .dark ? Color.darkBorder : Color.lightBorder)

            VStack(alignment: .leading, spacing: WidgetLayout.rowSpacingRegular) {
                ForEach(Array(entry.stories.prefix(3))) { story in
                    Link(destination: URL(string: "hnclient://story/\(story.id)")!) {
                        DetailedStoryRow(
                            story: story,
                            textColor: textColor,
                            secondaryTextColor: secondaryTextColor
                        )
                    }

                    if story.id != entry.stories.prefix(3).last?.id {
                        Divider()
                            .background(colorScheme == .dark ? Color.darkBorder : Color.lightBorder)
                    }
                }
            }

            Spacer(minLength: 0)
        }
        .padding(.vertical, WidgetLayout.verticalPaddingRegular)
        .padding(.horizontal, WidgetLayout.horizontalPaddingMedium)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetSurfaceBackground(backgroundColor)
    }
}

// MARK: - Large Widget View
/// Shows 6 stories with full details
struct LargeWidgetView: View {
    @Environment(\.colorScheme) var colorScheme
    var entry: HNWidgetEntry

    var backgroundColor: Color {
        colorScheme == .dark ? .darkBackground : .lightBackground
    }

    var textColor: Color {
        colorScheme == .dark ? .darkText : .lightText
    }

    var secondaryTextColor: Color {
        colorScheme == .dark ? Color.gray : Color(white: 0.4)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: WidgetLayout.rowSpacingRegular) {
            WidgetHeaderView(textColor: textColor, iconSize: 17, fontSize: 15)

            Divider()
                .background(colorScheme == .dark ? Color.darkBorder : Color.lightBorder)

            VStack(alignment: .leading, spacing: WidgetLayout.rowSpacingRegular) {
                ForEach(Array(entry.stories.prefix(6))) { story in
                    Link(destination: URL(string: "hnclient://story/\(story.id)")!) {
                        ExtendedStoryRow(
                            story: story,
                            textColor: textColor,
                            secondaryTextColor: secondaryTextColor,
                            timeAgo: timeAgo(from: story.time)
                        )
                    }

                    if story.id != entry.stories.prefix(6).last?.id {
                        Divider()
                            .background(colorScheme == .dark ? Color.darkBorder : Color.lightBorder)
                    }
                }
            }

            Spacer(minLength: 0)

            HStack(spacing: 4) {
                Spacer()
                Image(systemName: "arrow.clockwise")
                    .font(.system(size: 10))
                Text("Updated \(timeAgo(from: Int(entry.date.timeIntervalSince1970)))")
                    .font(.system(size: 11))
                    .foregroundColor(secondaryTextColor)
            }
        }
        .padding(.vertical, WidgetLayout.verticalPaddingRegular)
        .padding(.horizontal, WidgetLayout.horizontalPaddingLarge)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetSurfaceBackground(backgroundColor)
    }

    /// Convert Unix timestamp to "time ago" format
    private func timeAgo(from timestamp: Int) -> String {
        let date = Date(timeIntervalSince1970: TimeInterval(timestamp))
        let now = Date()
        let interval = now.timeIntervalSince(date)

        let hours = Int(interval / 3600)
        let days = Int(interval / 86400)

        if days > 0 {
            return "\(days)d ago"
        } else if hours > 0 {
            return "\(hours)h ago"
        } else {
            let minutes = Int(interval / 60)
            return "\(minutes)m ago"
        }
    }
}

// MARK: - Preview
struct HNWidgetView_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            HNWidgetView(entry: HNWidgetEntry.sample())
                .previewContext(WidgetPreviewContext(family: .systemSmall))
                .previewDisplayName("Small Widget")

            HNWidgetView(entry: HNWidgetEntry.sample())
                .previewContext(WidgetPreviewContext(family: .systemMedium))
                .previewDisplayName("Medium Widget")

            HNWidgetView(entry: HNWidgetEntry.sample())
                .previewContext(WidgetPreviewContext(family: .systemLarge))
                .previewDisplayName("Large Widget")

            // Dark mode previews
            HNWidgetView(entry: HNWidgetEntry.sample())
                .previewContext(WidgetPreviewContext(family: .systemMedium))
                .environment(\.colorScheme, .dark)
                .previewDisplayName("Medium Widget - Dark")
        }
    }
}
