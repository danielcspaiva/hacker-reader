import ExpoModulesCore
import WidgetKit

public class ReactNativeWidgetExtensionModule: Module {
    public func definition() -> ModuleDefinition {
        Name("ReactNativeWidgetExtension")

        // Refresh all widgets
        AsyncFunction("reloadAllTimelines") {
            WidgetCenter.shared.reloadAllTimelines()
        }

        // Refresh specific widget
        AsyncFunction("reloadTimelines") { (kind: String) in
            WidgetCenter.shared.reloadTimelines(ofKind: kind)
        }

        // Get current widget configurations
        AsyncFunction("getCurrentConfigurations") { (promise: Promise) in
            WidgetCenter.shared.getCurrentConfigurations { result in
                switch result {
                case .success(let configurations):
                    let configArray = configurations.map { config in
                        [
                            "kind": config.kind,
                            "family": "\(config.family)"
                        ]
                    }
                    promise.resolve(configArray)
                case .failure(let error):
                    promise.reject("ERROR", error.localizedDescription)
                }
            }
        }
    }
}
