import ExpoModulesCore

private let onExternalChange = "onExternalChange"

/// Wraps `NSUbiquitousKeyValueStore` (iCloud key-value storage: 1 MB total,
/// 1 MB per key, 1024 keys). The store has no async API: writes land locally
/// at once and iCloud uploads them on its own schedule; `synchronize()` only
/// nudges it. Changes made by other devices arrive as a notification, which is
/// forwarded to JS as `onExternalChange({ reason, keys })`.
public final class ICloudKVModule: Module {
  private var observer: NSObjectProtocol?

  private var store: NSUbiquitousKeyValueStore { .default }

  public func definition() -> ModuleDefinition {
    Name("ICloudKV")

    Events(onExternalChange)

    // False when the user is signed out of iCloud or has iCloud Drive off for
    // the app; the store then still accepts writes but never syncs them.
    Function("isAvailable") { () -> Bool in
      FileManager.default.ubiquityIdentityToken != nil
    }

    Function("getString") { (key: String) -> String? in
      self.store.string(forKey: key)
    }

    Function("setString") { (key: String, value: String) in
      self.store.set(value, forKey: key)
    }

    Function("remove") { (key: String) in
      self.store.removeObject(forKey: key)
    }

    Function("synchronize") { () -> Bool in
      self.store.synchronize()
    }

    OnStartObserving(onExternalChange) {
      self.startObserving()
    }

    OnStopObserving(onExternalChange) {
      self.stopObserving()
    }

    OnDestroy {
      self.stopObserving()
    }
  }

  private func startObserving() {
    guard observer == nil else { return }
    observer = NotificationCenter.default.addObserver(
      forName: NSUbiquitousKeyValueStore.didChangeExternallyNotification,
      object: store,
      queue: .main
    ) { [weak self] notification in
      let userInfo = notification.userInfo
      let rawReason = userInfo?[NSUbiquitousKeyValueStoreChangeReasonKey] as? Int
      let keys = userInfo?[NSUbiquitousKeyValueStoreChangedKeysKey] as? [String] ?? []
      self?.sendEvent(onExternalChange, [
        "reason": Self.reasonName(rawReason),
        "keys": keys,
      ])
    }
  }

  private func stopObserving() {
    if let observer {
      NotificationCenter.default.removeObserver(observer)
    }
    observer = nil
  }

  private static func reasonName(_ raw: Int?) -> String {
    switch raw {
    case NSUbiquitousKeyValueStoreServerChange: return "server"
    case NSUbiquitousKeyValueStoreInitialSyncChange: return "initialSync"
    case NSUbiquitousKeyValueStoreQuotaViolationChange: return "quotaViolation"
    case NSUbiquitousKeyValueStoreAccountChange: return "accountChange"
    default: return "unknown"
    }
  }
}
