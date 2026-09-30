// Adds the iCloud key-value storage entitlement that modules/icloud-kv needs
// (NSUbiquitousKeyValueStore). The App ID must also have the iCloud capability
// with "Key-value storage" enabled in the Apple Developer portal; EAS / Xcode
// automatic signing picks that up from this entitlement.
const { withEntitlementsPlist } = require("expo/config-plugins");

const KVSTORE_ENTITLEMENT = "com.apple.developer.ubiquity-kvstore-identifier";

module.exports = function withICloudKV(config) {
  return withEntitlementsPlist(config, (mod) => {
    mod.modResults[KVSTORE_ENTITLEMENT] =
      "$(TeamIdentifierPrefix)$(CFBundleIdentifier)";
    return mod;
  });
};
