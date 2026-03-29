import WidgetKit
import SwiftUI

// MARK: - HNWidgetProvider
/// Provides timeline entries for the HN widget by fetching data from the Hacker News API
struct HNWidgetProvider: TimelineProvider {

    // MARK: - App Group Configuration
    private let appGroup = "group.com.danielcspaiva.hnclient"
    private let cacheKey = "cachedTopStories"
    private let lastUpdatedKey = "lastUpdated"

    // MARK: - TimelineProvider Methods

    /// Provides a placeholder entry for the widget gallery
    func placeholder(in context: Context) -> HNWidgetEntry {
        HNWidgetEntry.sample()
    }

    /// Provides a snapshot for the widget gallery or transitional states
    func getSnapshot(in context: Context, completion: @escaping (HNWidgetEntry) -> Void) {
        if context.isPreview {
            completion(HNWidgetEntry.sample())
        } else {
            // Try to load cached data for quick snapshot
            if let cachedEntry = loadCachedEntry() {
                completion(cachedEntry)
            } else {
                completion(HNWidgetEntry.sample())
            }
        }
    }

    /// Provides the timeline of entries for the widget
    func getTimeline(in context: Context, completion: @escaping (Timeline<HNWidgetEntry>) -> Void) {
        fetchTopStories { stories in
            let entry: HNWidgetEntry

            if let stories = stories, !stories.isEmpty {
                entry = HNWidgetEntry(date: Date(), stories: stories, isPlaceholder: false)
                // Cache the successful result
                cacheEntry(entry)
            } else {
                // Use cached data if fetch fails
                if let cachedEntry = loadCachedEntry() {
                    entry = cachedEntry
                } else {
                    entry = HNWidgetEntry.error()
                }
            }

            // Update widget every 30 minutes
            let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
            let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
            completion(timeline)
        }
    }

    // MARK: - Hacker News API Integration

    /// Fetch top stories from the Hacker News API
    private func fetchTopStories(completion: @escaping ([HNStory]?) -> Void) {
        // Fetch top story IDs
        guard let url = URL(string: "https://hacker-news.firebaseio.com/v0/topstories.json") else {
            completion(nil)
            return
        }

        let task = URLSession.shared.dataTask(with: url) { data, response, error in
            guard let data = data, error == nil else {
                print("Error fetching top story IDs: \(error?.localizedDescription ?? "Unknown error")")
                completion(nil)
                return
            }

            do {
                let storyIds = try JSONDecoder().decode([Int].self, from: data)
                // Get first 10 story IDs
                let topIds = Array(storyIds.prefix(10))

                // Fetch details for each story
                fetchStoryDetails(ids: topIds, completion: completion)
            } catch {
                print("Error decoding story IDs: \(error.localizedDescription)")
                completion(nil)
            }
        }
        task.resume()
    }

    /// Fetch details for multiple story IDs
    private func fetchStoryDetails(ids: [Int], completion: @escaping ([HNStory]) -> Void) {
        var storiesWithIndex: [(story: HNStory, index: Int)] = []
        let group = DispatchGroup()

        for (index, id) in ids.enumerated() {
            group.enter()
            fetchStory(id: id) { story in
                if let story = story {
                    storiesWithIndex.append((story, index))
                }
                group.leave()
            }
        }

        group.notify(queue: .main) {
            // Sort by original index to preserve HN API order
            let sortedStories = storiesWithIndex
                .sorted { $0.index < $1.index }
                .map { $0.story }
            completion(sortedStories)
        }
    }

    /// Fetch a single story by ID
    private func fetchStory(id: Int, completion: @escaping (HNStory?) -> Void) {
        guard let url = URL(string: "https://hacker-news.firebaseio.com/v0/item/\(id).json") else {
            completion(nil)
            return
        }

        let task = URLSession.shared.dataTask(with: url) { data, response, error in
            guard let data = data, error == nil else {
                print("Error fetching story \(id): \(error?.localizedDescription ?? "Unknown error")")
                completion(nil)
                return
            }

            do {
                let story = try JSONDecoder().decode(HNStory.self, from: data)
                completion(story)
            } catch {
                print("Error decoding story \(id): \(error.localizedDescription)")
                completion(nil)
            }
        }
        task.resume()
    }

    // MARK: - Caching with App Group

    /// Cache entry to shared UserDefaults for app group
    private func cacheEntry(_ entry: HNWidgetEntry) {
        guard let sharedDefaults = UserDefaults(suiteName: appGroup) else {
            print("Failed to access app group UserDefaults")
            return
        }

        do {
            let data = try JSONEncoder().encode(entry.stories)
            sharedDefaults.set(data, forKey: cacheKey)
            sharedDefaults.set(Date(), forKey: lastUpdatedKey)
        } catch {
            print("Error caching stories: \(error.localizedDescription)")
        }
    }

    /// Load cached entry from shared UserDefaults
    private func loadCachedEntry() -> HNWidgetEntry? {
        guard let sharedDefaults = UserDefaults(suiteName: appGroup),
              let data = sharedDefaults.data(forKey: cacheKey) else {
            return nil
        }

        do {
            let stories = try JSONDecoder().decode([HNStory].self, from: data)
            let lastUpdated = sharedDefaults.object(forKey: lastUpdatedKey) as? Date ?? Date()
            return HNWidgetEntry(date: lastUpdated, stories: stories, isPlaceholder: false)
        } catch {
            print("Error loading cached stories: \(error.localizedDescription)")
            return nil
        }
    }
}
