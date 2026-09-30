import WidgetKit
import SwiftUI
internal import ExpoWidgets

@main
struct ExportWidgets0: WidgetBundle {
  var body: some Widget {
    if #available(iOS 17.0, *) {
      HNTopStoriesWidget()
    }
    HNBookmarksWidget()
    WidgetLiveActivity()
  }
}