import ActivityKit
import Foundation

// MARK: - HNActivityAttributes
/// Attributes for Live Activities (currently not used, but required by react-native-widget-extension)
/// This file is a placeholder for future live activity implementation
struct HNActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Empty content state - we're not using live activities yet
        var placeholder: String = ""
    }

    // Empty attributes - we're not using live activities yet
    var placeholder: String = ""
}
