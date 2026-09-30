/**
 * PostHog Property Names
 *
 * Centralized enum for all analytics property names.
 * Naming convention: {descriptor}_{noun} in lowercase with underscores.
 * Use these constants for any property that appears in multiple events.
 *
 * @example
 * ```ts
 * import { AnalyticsProperty } from '@/lib/analytics/posthog-properties';
 * posthog.capture('story_viewed', {
 *   [AnalyticsProperty.STORY_ID]: 123,
 *   [AnalyticsProperty.CATEGORY]: 'top'
 * });
 * ```
 */
export enum AnalyticsProperty {
  // Story Properties
  STORY_ID = "story_id",
  STORY_TITLE = "story_title",
  STORY_SCORE = "story_score",
  STORY_DOMAIN = "story_domain",
  HAS_URL = "has_url",
  COMMENT_COUNT = "comment_count",

  // Category & Navigation
  CATEGORY = "category",
  FROM_CATEGORY = "from_category",
  TO_CATEGORY = "to_category",
  PAGE_NUMBER = "page_number",
  DAY = "day",

  // Search
  QUERY = "query",
  RESULTS_COUNT = "results_count",
  RESULT_POSITION = "result_position",
  SEARCH_SORT = "sort",
  SEARCH_SCOPE = "scope",
  SEARCH_DATE_RANGE = "date_range",
  SEARCH_MIN_POINTS = "min_points",
  SEARCH_HAS_AUTHOR = "has_author_filter",

  // Comment Properties
  COMMENT_ID = "comment_id",
  DEPTH_LEVEL = "depth_level",
  CHILD_COUNT = "child_count",
  NEW_COMMENT_COUNT = "new_comment_count",

  // Mutes
  MUTE_KIND = "mute_kind",
  MUTE_SOURCE = "mute_source",

  // Share
  SHARE_METHOD = "share_method",

  // Submit
  SUBMIT_KIND = "submit_kind",
  SUBMIT_SOURCE = "submit_source",
  DISCUSSION_COUNT = "discussion_count",

  // User Properties
  USER_KARMA = "user_karma",
  ACCOUNT_AGE_DAYS = "account_age_days",
  USERNAME = "username",

  // App State (Super Properties)
  APP_VERSION = "app_version",
  PLATFORM = "platform",
  COLOR_SCHEME = "color_scheme",
  IS_AUTHENTICATED = "is_authenticated",

  // Pro
  PRO_FEATURE = "feature",
  PRO_PLAN = "plan",

  // Widget
  WIDGET_SIZE = "widget_size",
  WIDGET_KIND = "widget_kind",

  // General
  URL = "url",
}
