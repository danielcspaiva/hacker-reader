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

  // Search
  SEARCH_PERFORMED = "search_performed",
  SEARCH_RESULT_CLICKED = "search_result_clicked",

  // Engagement Actions
  STORY_UPVOTED = "story_upvoted",
  STORY_UNVOTED = "story_unvoted",
  STORY_BOOKMARKED = "story_bookmarked",
  BOOKMARK_REMOVED = "bookmark_removed",
  STORY_SHARED = "story_shared",
  COMMENT_VIEWED = "comment_viewed",
  COMMENT_COLLAPSED = "comment_collapsed",
  COMMENT_LINK_CLICKED = "comment_link_clicked",

  // Authentication
  LOGIN_INITIATED = "login_initiated",
  LOGIN_COMPLETED = "login_completed",
  LOGOUT_TRIGGERED = "logout_triggered",

  // Settings & Preferences
  THEME_CHANGED = "theme_changed",
  SETTINGS_VIEWED = "settings_viewed",

  // Widget Interactions (iOS only)
  WIDGET_ADDED = "widget_added",
  WIDGET_TAPPED = "widget_tapped",
}
