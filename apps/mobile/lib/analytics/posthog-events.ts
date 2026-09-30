/**
 * PostHog Event Names
 *
 * Centralized enum for all analytics event names.
 * Naming convention: {object}_{action} in lowercase with underscores.
 * Use past tense for completed actions.
 *
 * @example
 * ```ts
 * import { AnalyticsEvent } from '@/lib/analytics/posthog-events';
 * posthog.capture(AnalyticsEvent.STORY_VIEWED, { story_id: 123 });
 * ```
 */
export enum AnalyticsEvent {
  // App Lifecycle
  APP_OPENED = "app_opened",
  APP_BACKGROUNDED = "app_backgrounded",
  SESSION_STARTED = "session_started",

  // Content Discovery
  STORY_VIEWED = "story_viewed",
  STORY_LINK_OPENED = "story_link_opened",
  CATEGORY_CHANGED = "category_changed",
  INFINITE_SCROLL_TRIGGERED = "infinite_scroll_triggered",

  PAST_FRONT_PAGE_VIEWED = "past_front_page_viewed",

  // Search
  SEARCH_PERFORMED = "search_performed",
  SEARCH_RESULT_CLICKED = "search_result_clicked",

  // Engagement Actions
  STORY_UPVOTED = "story_upvoted",
  STORY_UNVOTED = "story_unvoted",
  STORY_BOOKMARKED = "story_bookmarked",
  BOOKMARK_REMOVED = "bookmark_removed",
  STORY_SHARED = "story_shared",
  STORY_HIDDEN = "story_hidden",
  STORY_MARKED_READ = "story_marked_read",
  STORY_MARKED_UNREAD = "story_marked_unread",
  NEXT_NEW_COMMENT_TAPPED = "next_new_comment_tapped",
  MUTE_ADDED = "mute_added",
  MUTE_REMOVED = "mute_removed",
  STORY_FLAGGED = "story_flagged",
  COMMENT_VIEWED = "comment_viewed",
  COMMENT_COLLAPSED = "comment_collapsed",
  COMMENT_LINK_CLICKED = "comment_link_clicked",
  COMMENT_HIDDEN = "comment_hidden",
  COMMENT_FLAGGED = "comment_flagged",

  // Submitting & sharing in
  STORY_SUBMITTED = "story_submitted",
  SUBMIT_DUPLICATE_FOUND = "submit_duplicate_found",
  SHARE_EXTENSION_OPENED = "share_extension_opened",
  DISCUSSION_FOUND = "discussion_found",

  // Authentication
  LOGIN_INITIATED = "login_initiated",
  LOGIN_COMPLETED = "login_completed",
  LOGOUT_TRIGGERED = "logout_triggered",

  // Settings & Preferences
  THEME_CHANGED = "theme_changed",
  SETTINGS_VIEWED = "settings_viewed",
  TEXT_SIZE_CHANGED = "text_size_changed",
  APP_ICON_CHANGED = "app_icon_changed",

  // Offline
  OFFLINE_BANNER_SHOWN = "offline_banner_shown",

  // Pro
  PAYWALL_VIEWED = "paywall_viewed",
  PURCHASE_STARTED = "purchase_started",
  PURCHASE_COMPLETED = "purchase_completed",
  PURCHASE_FAILED = "purchase_failed",
  PURCHASE_RESTORED = "purchase_restored",
  REPLIES_VIEWED = "replies_viewed",
  REPLY_NOTIFICATIONS_ENABLED = "reply_notifications_enabled",
  REPLY_NOTIFICATIONS_DISABLED = "reply_notifications_disabled",
  ALERT_ADDED = "alert_added",
  ALERT_REMOVED = "alert_removed",
  NOTIFICATION_OPENED = "notification_opened",
  SUMMARY_REQUESTED = "summary_requested",
  SUMMARY_VIEWED = "summary_viewed",
  SUMMARY_COMMENT_LINK_TAPPED = "summary_comment_link_tapped",
  DIGEST_ENABLED = "digest_enabled",
  DIGEST_DISABLED = "digest_disabled",
  DIGEST_VIEWED = "digest_viewed",

  // iCloud sync
  ICLOUD_SYNC_TOGGLED = "icloud_sync_toggled",
  ICLOUD_SYNC_COMPLETED = "icloud_sync_completed",

  // Widget Interactions (iOS only)
  WIDGET_TAPPED = "widget_tapped",
}
