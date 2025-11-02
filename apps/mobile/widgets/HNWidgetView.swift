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

func timeAgoString(from timestamp: Int, includeSuffix: Bool = true) -> String {
    let date = Date(timeIntervalSince1970: TimeInterval(timestamp))
    let now = Date()
    let interval = max(now.timeIntervalSince(date), 0)

    let minutes = Int(interval / 60)
    let hours = Int(interval / 3600)
    let days = Int(interval / 86400)

    let suffix = includeSuffix ? " ago" : ""

    if days > 0 {
        return "\(days)d" + suffix
    } else if hours > 0 {
        return "\(hours)h" + suffix
    } else {
        return "\(max(minutes, 1))m" + suffix
    }
}

/// Extracts the domain from a URL string, removing 'www.' prefix
/// - Parameter urlString: Full URL string
/// - Returns: Domain name or nil if invalid URL
func extractDomain(from urlString: String?) -> String? {
    guard let urlString = urlString,
          let url = URL(string: urlString),
          let host = url.host else {
        return nil
    }

    // Remove 'www.' prefix
    if host.hasPrefix("www.") {
        return String(host.dropFirst(4))
    }

    return host
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
    static let horizontalPaddingSmall: CGFloat = 3
    static let horizontalPaddingMedium: CGFloat = 6
    static let horizontalPaddingLarge: CGFloat = 8

    static let verticalPaddingTight: CGFloat = 2
    static let verticalPaddingRegular: CGFloat = 6

    static let rowSpacingTight: CGFloat = 3
    static let rowSpacingRegular: CGFloat = 4
}

// MARK: - Shared Subviews
enum WidgetHeaderStyle {
    case leadingAppIcon
    case trailingYBookWithFlame
}

struct WidgetHeaderView: View {
    let textColor: Color
    let iconSize: CGFloat
    let fontSize: CGFloat
    let style: WidgetHeaderStyle

    var body: some View {
        let spacing: CGFloat = style == .leadingAppIcon ? 5 : 6

        HStack(spacing: spacing) {
            if style == .leadingAppIcon {
                Image("ybook")
                    .resizable()
                    .renderingMode(.original)
                    .interpolation(.high)
                    .aspectRatio(contentMode: .fit)
                    .frame(width: iconSize, height: iconSize)
                    .clipShape(RoundedRectangle(cornerRadius: iconSize * 0.2))
            }

            if style == .trailingYBookWithFlame {
                Image(systemName: "flame")
                    .font(.system(size: fontSize, weight: .semibold))
                    .foregroundColor(.hnOrange)
            }

            Text("Top Stories")
                .font(.system(size: fontSize, weight: .semibold))
                .foregroundColor(textColor)
                .lineLimit(1)
                .truncationMode(.tail)
                .frame(maxWidth: .infinity, alignment: .leading)

            if style == .trailingYBookWithFlame {
                Image("ybook")
                    .resizable()
                    .renderingMode(.original)
                    .interpolation(.high)
                    .aspectRatio(contentMode: .fit)
                    .frame(width: iconSize, height: iconSize)
                    .clipShape(RoundedRectangle(cornerRadius: iconSize * 0.2))
            }
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

            if let domain = extractDomain(from: story.url) {
                Text(domain)
                    .font(.system(size: 10))
                    .foregroundColor(textColor.opacity(0.6))
                    .lineLimit(1)
            }

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
        let commentCount = story.descendants ?? 0
        let timeText = timeAgoString(from: story.time)

        VStack(alignment: .leading, spacing: 4) {
            Text(story.title)
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(textColor)
                .lineLimit(2)
                .fixedSize(horizontal: false, vertical: true)
                .multilineTextAlignment(.leading)

            HStack(spacing: 6) {
                HStack(spacing: 3) {
                    Image(systemName: "arrow.up")
                    Text("\(story.score)")
                }
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(.hnOrange)

                HStack(spacing: 3) {
                    Image(systemName: "bubble.left.and.bubble.right")
                    Text("\(commentCount)")
                        .lineLimit(1)
                        .truncationMode(.tail)
                }
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(secondaryTextColor)

                HStack(spacing: 3) {
                    Image(systemName: "clock")
                    Text(timeText)
                        .lineLimit(1)
                        .truncationMode(.tail)
                }
                .font(.system(size: 11, weight: .semibold))
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
        let commentCount = story.descendants ?? 0

        VStack(alignment: .leading, spacing: 3) {
            Text(story.title)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(textColor)
                .lineLimit(2)
                .multilineTextAlignment(.leading)

            if let domain = extractDomain(from: story.url) {
                Text(domain)
                    .font(.system(size: 11))
                    .foregroundColor(textColor.opacity(0.6))
                    .lineLimit(1)
            }

            HStack(spacing: 6) {
                HStack(spacing: 3) {
                    Image(systemName: "arrow.up")
                    Text("\(story.score)")
                }
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(.hnOrange)

                HStack(spacing: 3) {
                    Image(systemName: "bubble.left.and.bubble.right")
                    Text("\(commentCount)")
                        .lineLimit(1)
                        .truncationMode(.tail)
                }
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(secondaryTextColor)

                HStack(spacing: 3) {
                    Image(systemName: "clock")
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

struct HighlightStoryView: View {
    let story: HNStory
    let textColor: Color
    let secondaryTextColor: Color

    var body: some View {
        let commentCount = story.descendants ?? 0

        VStack(alignment: .leading, spacing: 5) {
            VStack(alignment: .leading, spacing: 2) {
                Text(story.title)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(textColor)
                    .lineLimit(4)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)

                if let domain = extractDomain(from: story.url) {
                    Text(domain)
                        .font(.system(size: 11))
                        .foregroundColor(textColor.opacity(0.6))
                        .lineLimit(1)
                }
            }

            Spacer(minLength: 0)

            HStack(alignment: .firstTextBaseline, spacing: 6) {
                HStack(spacing: 3) {
                    Image(systemName: "arrow.up")
                    Text("\(story.score)")
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(.hnOrange)

                HStack(spacing: 3) {
                    Image(systemName: "bubble.left.and.bubble.right")
                    Text("\(commentCount)")
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(secondaryTextColor)

                HStack(spacing: 3) {
                    Image(systemName: "clock")
                    Text(timeAgoString(from: story.time, includeSuffix: false))
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
                .font(.system(size: 11))
                .foregroundColor(secondaryTextColor)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
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
/// Shows top story in compact format
struct SmallWidgetView: View {
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
            if let topStory = entry.stories.first {
                Link(destination: URL(string: "hnclient://story/\(topStory.id)")!) {
                    HighlightStoryView(
                        story: topStory,
                        textColor: textColor,
                        secondaryTextColor: secondaryTextColor
                    )
                    .contentShape(Rectangle())
                }
            } else {
                Text("No stories available")
                    .font(.system(size: 13))
                    .foregroundColor(textColor.opacity(0.7))
            }

        }
        .padding(.vertical, WidgetLayout.verticalPaddingTight)
        .padding(.horizontal, WidgetLayout.horizontalPaddingSmall)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetSurfaceBackground(backgroundColor)
    }
}

// MARK: - Medium Widget View
/// Shows 2 stories with more details
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
            WidgetHeaderView(
                textColor: textColor,
                iconSize: 20,
                fontSize: 15,
                style: .trailingYBookWithFlame
            )

            Divider()
                .background(colorScheme == .dark ? Color.darkBorder : Color.lightBorder)

            VStack(alignment: .leading, spacing: 0) {
                ForEach(Array(entry.stories.prefix(2).enumerated()), id: \.element.id) { index, story in
                    Link(destination: URL(string: "hnclient://story/\(story.id)")!) {
                        DetailedStoryRow(
                            story: story,
                            textColor: textColor,
                            secondaryTextColor: secondaryTextColor
                        )
                    }

                    if index < entry.stories.prefix(2).count - 1 {
                        Spacer()
                        Divider()
                            .background(colorScheme == .dark ? Color.darkBorder : Color.lightBorder)
                        Spacer()
                    }
                }
            }
            .frame(maxHeight: .infinity)
        }
        .padding(.vertical, WidgetLayout.verticalPaddingRegular)
        .padding(.horizontal, WidgetLayout.horizontalPaddingMedium)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetSurfaceBackground(backgroundColor)
    }
}

// MARK: - Large Widget View
/// Shows 4 stories with full details
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
            WidgetHeaderView(
                textColor: textColor,
                iconSize: 20,
                fontSize: 15,
                style: .trailingYBookWithFlame
            )

            Divider()
                .background(colorScheme == .dark ? Color.darkBorder : Color.lightBorder)

            VStack(alignment: .leading, spacing: 0) {
                ForEach(Array(entry.stories.prefix(4).enumerated()), id: \.element.id) { index, story in
                    Link(destination: URL(string: "hnclient://story/\(story.id)")!) {
                        ExtendedStoryRow(
                            story: story,
                            textColor: textColor,
                            secondaryTextColor: secondaryTextColor,
                            timeAgo: timeAgoString(from: story.time)
                        )
                    }

                    if index < entry.stories.prefix(4).count - 1 {
                        Spacer()
                        Divider()
                            .background(colorScheme == .dark ? Color.darkBorder : Color.lightBorder)
                        Spacer()
                    }
                }
            }
            .frame(maxHeight: .infinity)
        }
        .padding(.vertical, WidgetLayout.verticalPaddingRegular)
        .padding(.horizontal, WidgetLayout.horizontalPaddingLarge)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetSurfaceBackground(backgroundColor)
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
