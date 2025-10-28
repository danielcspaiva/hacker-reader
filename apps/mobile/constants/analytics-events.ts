/**
 * Analytics event names and properties
 *
 * Centralized constants for PostHog event tracking.
 * Use these constants to ensure consistency across the app.
 */

// Navigation & Discovery Events
export const EVENTS = {
  // Story Discovery
  STORY_VIEWED: 'story_viewed',
  STORY_OPENED: 'story_opened',
  STORY_LINK_OPENED: 'story_link_opened',
  CATEGORY_CHANGED: 'category_changed',
  INFINITE_SCROLL_TRIGGERED: 'infinite_scroll_triggered',

  // Engagement - Voting
  STORY_UPVOTED: 'story_upvoted',
  STORY_UNVOTED: 'story_unvoted',
  VOTE_FAILED: 'vote_failed',

  // Engagement - Bookmarking
  STORY_BOOKMARKED: 'story_bookmarked',
  STORY_UNBOOKMARKED: 'story_unbookmarked',
  BOOKMARKS_CLEARED: 'bookmarks_cleared',

  // Engagement - Comments
  COMMENT_VIEWED: 'comment_viewed',
  COMMENT_COLLAPSED: 'comment_collapsed',
  COMMENT_REPLY_STARTED: 'comment_reply_started',
  COMMENT_POSTED: 'comment_posted',
  COMMENT_FAILED: 'comment_failed',

  // Engagement - Sharing
  STORY_SHARED: 'story_shared',

  // Authentication
  LOGIN_INITIATED: 'login_initiated',
  LOGIN_COMPLETED: 'login_completed',
  LOGIN_FAILED: 'login_failed',
  LOGOUT_COMPLETED: 'logout_completed',
  SESSION_EXPIRED: 'session_expired',

  // Settings & Preferences
  THEME_CHANGED: 'theme_changed',
  CACHE_CLEARED: 'cache_cleared',
  APP_RATED: 'app_rated',
  SOURCE_CODE_VIEWED: 'source_code_viewed',
} as const;

// Event property keys
export const EVENT_PROPERTIES = {
  // Story properties
  STORY_ID: 'story_id',
  STORY_TITLE: 'story_title',
  STORY_URL: 'story_url',
  STORY_DOMAIN: 'story_domain',
  STORY_SCORE: 'story_score',
  STORY_COMMENTS_COUNT: 'story_comments_count',
  STORY_AUTHOR: 'story_author',
  STORY_TYPE: 'story_type',

  // Category properties
  CATEGORY: 'category',
  PREVIOUS_CATEGORY: 'previous_category',

  // Comment properties
  COMMENT_ID: 'comment_id',
  COMMENT_DEPTH: 'comment_depth',
  COMMENT_AUTHOR: 'comment_author',
  PARENT_ID: 'parent_id',

  // Error properties
  ERROR_TYPE: 'error_type',
  ERROR_MESSAGE: 'error_message',
  ERROR_CODE: 'error_code',

  // UI properties
  SOURCE: 'source', // Where the action was triggered from
  INDEX: 'index', // Position in list
  HAS_URL: 'has_url',
  HAS_PREVIEW: 'has_preview',

  // Theme properties
  COLOR_SCHEME: 'color_scheme',
  COLOR_PALETTE: 'color_palette',

  // Pagination properties
  PAGE: 'page',
  TOTAL_ITEMS_LOADED: 'total_items_loaded',
} as const;

// User property keys (set via posthog.setPersonProperties)
export const USER_PROPERTIES = {
  IS_AUTHENTICATED: 'is_authenticated',
  COLOR_SCHEME: 'color_scheme',
  COLOR_PALETTE: 'color_palette',
  PLATFORM: 'platform',
  APP_VERSION: 'app_version',
} as const;

// Event property value types
export type EventName = typeof EVENTS[keyof typeof EVENTS];
export type EventPropertyKey = typeof EVENT_PROPERTIES[keyof typeof EVENT_PROPERTIES];
export type UserPropertyKey = typeof USER_PROPERTIES[keyof typeof USER_PROPERTIES];

// Common event property interfaces
export interface StoryEventProperties {
  [EVENT_PROPERTIES.STORY_ID]?: number;
  [EVENT_PROPERTIES.STORY_TITLE]?: string;
  [EVENT_PROPERTIES.STORY_URL]?: string;
  [EVENT_PROPERTIES.STORY_DOMAIN]?: string;
  [EVENT_PROPERTIES.STORY_SCORE]?: number;
  [EVENT_PROPERTIES.STORY_COMMENTS_COUNT]?: number;
  [EVENT_PROPERTIES.STORY_AUTHOR]?: string;
  [EVENT_PROPERTIES.STORY_TYPE]?: string;
  [EVENT_PROPERTIES.INDEX]?: number;
  [EVENT_PROPERTIES.HAS_URL]?: boolean;
  [EVENT_PROPERTIES.HAS_PREVIEW]?: boolean;
}

export interface CategoryEventProperties {
  [EVENT_PROPERTIES.CATEGORY]?: string;
  [EVENT_PROPERTIES.PREVIOUS_CATEGORY]?: string;
}

export interface CommentEventProperties {
  [EVENT_PROPERTIES.COMMENT_ID]?: number;
  [EVENT_PROPERTIES.COMMENT_DEPTH]?: number;
  [EVENT_PROPERTIES.COMMENT_AUTHOR]?: string;
  [EVENT_PROPERTIES.PARENT_ID]?: number;
  [EVENT_PROPERTIES.STORY_ID]?: number;
}

export interface ErrorEventProperties {
  [EVENT_PROPERTIES.ERROR_TYPE]?: string;
  [EVENT_PROPERTIES.ERROR_MESSAGE]?: string;
  [EVENT_PROPERTIES.ERROR_CODE]?: string;
}
