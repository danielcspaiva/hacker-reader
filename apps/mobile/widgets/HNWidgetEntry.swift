import WidgetKit
import SwiftUI

// MARK: - HNStory Model
/// Represents a single Hacker News story
struct HNStory: Codable, Identifiable {
    let id: Int
    let title: String
    let score: Int
    let by: String
    let time: Int

    /// Placeholder story for loading states
    static let placeholder = HNStory(
        id: 0,
        title: "Loading top stories from Hacker News...",
        score: 0,
        by: "hackernews",
        time: Int(Date().timeIntervalSince1970)
    )

    /// Sample stories for preview and placeholder states
    static let sampleStories = [
        HNStory(id: 1, title: "Show HN: I built a React Native Hacker News client with widgets", score: 234, by: "developer", time: Int(Date().timeIntervalSince1970 - 3600)),
        HNStory(id: 2, title: "How to build iOS widgets with React Native and Expo", score: 156, by: "engineer", time: Int(Date().timeIntervalSince1970 - 7200)),
        HNStory(id: 3, title: "Building native features in React Native with Expo Modules", score: 89, by: "coder", time: Int(Date().timeIntervalSince1970 - 10800)),
        HNStory(id: 4, title: "SwiftUI best practices for iOS widget development", score: 67, by: "swiftdev", time: Int(Date().timeIntervalSince1970 - 14400)),
        HNStory(id: 5, title: "React Native performance optimization techniques", score: 45, by: "jsdev", time: Int(Date().timeIntervalSince1970 - 18000))
    ]
}

// MARK: - HNWidgetEntry
/// Timeline entry for the HN widget
struct HNWidgetEntry: TimelineEntry {
    let date: Date
    let stories: [HNStory]
    let isPlaceholder: Bool

    /// Create a placeholder entry for loading states
    static func placeholder() -> HNWidgetEntry {
        HNWidgetEntry(
            date: Date(),
            stories: [HNStory.placeholder],
            isPlaceholder: true
        )
    }

    /// Create a sample entry for previews
    static func sample() -> HNWidgetEntry {
        HNWidgetEntry(
            date: Date(),
            stories: HNStory.sampleStories,
            isPlaceholder: false
        )
    }

    /// Create an error entry when data fetch fails
    static func error() -> HNWidgetEntry {
        HNWidgetEntry(
            date: Date(),
            stories: [
                HNStory(
                    id: 0,
                    title: "Unable to load stories. Please check your connection.",
                    score: 0,
                    by: "system",
                    time: Int(Date().timeIntervalSince1970)
                )
            ],
            isPlaceholder: true
        )
    }
}
