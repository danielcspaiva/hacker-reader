import Constants from "expo-constants";

/**
 * App Configuration
 *
 * Centralized configuration for app metadata and URLs.
 * App name and version are sourced from app.json via expo-constants.
 */

/** App display name (from app.json) */
export const APP_NAME = Constants.expoConfig?.name ?? "Hacker Reader";

/** App version (from app.json) */
export const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

/** GitHub repository URL */
export const REPO_URL = "https://github.com/danielcspaiva/hacker-reader";

/**
 * iOS App Store URL
 * TODO: Update with actual App Store link after launch
 */
export const IOS_APP_STORE_URL =
  "https://apps.apple.com/us/app/hacker-reader/id6754137305";

/**
 * Android Play Store URL
 * TODO: Update with actual Play Store link after launch
 */
export const ANDROID_PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.danielcspaiva.hnclient";

/**
 * App Configuration object with all metadata
 */
export const AppConfig = {
  name: APP_NAME,
  version: APP_VERSION,
  repoUrl: REPO_URL,
  iosStoreUrl: IOS_APP_STORE_URL,
  androidStoreUrl: ANDROID_PLAY_STORE_URL,
} as const;
