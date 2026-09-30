/**
 * PostHog Analytics Tracking Utilities
 *
 * Provides typed wrapper functions for PostHog event tracking.
 * All tracking functions are type-safe and follow naming conventions.
 */

import * as Application from "expo-application";
import { usePostHog } from "posthog-react-native";
import { Platform } from "react-native";

import type {
  SearchDateRange,
  SearchScope,
  SearchSort,
  StoryCategory,
} from "@/lib/hn";
import { reportError } from "@/lib/observability/report-error";
import type { ProFeatureId } from "@/lib/pro/features";
import type { PlanKind } from "@/lib/pro/plans";
import type { TextSize } from "@/lib/text/text-size";
import type { WidgetKind } from "@/lib/widgets/tap";

import { AnalyticsEvent } from "./posthog-events";
import { AnalyticsProperty } from "./posthog-properties";

/** Where a submission started: a menu, the profile tab, or a shared link. */
export type SubmitSource = "feed_menu" | "profile" | "share";

/** Where a summary was requested: the story's more menu or the header pill. */
export type SummarySource = "menu" | "pill";

export type WidgetSize = "small" | "medium" | "large" | "accessory";

/**
 * Type-safe event properties for each analytics event
 */
export interface EventProperties {
  // App Lifecycle
  [AnalyticsEvent.APP_OPENED]: {
    [AnalyticsProperty.APP_VERSION]: string;
    [AnalyticsProperty.PLATFORM]: string;
  };
  [AnalyticsEvent.APP_BACKGROUNDED]: Record<string, never>;
  [AnalyticsEvent.SESSION_STARTED]: Record<string, never>;

  // Content Discovery
  [AnalyticsEvent.STORY_VIEWED]: {
    [AnalyticsProperty.STORY_ID]: number;
    [AnalyticsProperty.STORY_TITLE]?: string;
    [AnalyticsProperty.CATEGORY]?: StoryCategory;
    [AnalyticsProperty.STORY_SCORE]?: number;
    [AnalyticsProperty.HAS_URL]?: boolean;
    [AnalyticsProperty.COMMENT_COUNT]?: number;
  };
  [AnalyticsEvent.STORY_LINK_OPENED]: {
    [AnalyticsProperty.STORY_ID]: number;
    [AnalyticsProperty.STORY_DOMAIN]?: string;
    [AnalyticsProperty.URL]: string;
  };
  [AnalyticsEvent.CATEGORY_CHANGED]: {
    [AnalyticsProperty.FROM_CATEGORY]: StoryCategory;
    [AnalyticsProperty.TO_CATEGORY]: StoryCategory;
  };
  [AnalyticsEvent.INFINITE_SCROLL_TRIGGERED]: {
    [AnalyticsProperty.CATEGORY]: StoryCategory;
    [AnalyticsProperty.PAGE_NUMBER]: number;
  };

  [AnalyticsEvent.PAST_FRONT_PAGE_VIEWED]: {
    [AnalyticsProperty.DAY]: string;
  };

  // Search
  [AnalyticsEvent.SEARCH_PERFORMED]: {
    [AnalyticsProperty.QUERY]: string;
    [AnalyticsProperty.RESULTS_COUNT]: number;
    [AnalyticsProperty.SEARCH_SORT]: SearchSort;
    [AnalyticsProperty.SEARCH_SCOPE]: SearchScope;
    [AnalyticsProperty.SEARCH_DATE_RANGE]: SearchDateRange;
    [AnalyticsProperty.SEARCH_MIN_POINTS]: number;
    [AnalyticsProperty.SEARCH_HAS_AUTHOR]: boolean;
  };
  [AnalyticsEvent.SEARCH_RESULT_CLICKED]: {
    [AnalyticsProperty.QUERY]: string;
    [AnalyticsProperty.STORY_ID]: number;
    [AnalyticsProperty.RESULT_POSITION]: number;
  };

  // Engagement Actions
  [AnalyticsEvent.STORY_UPVOTED]: {
    [AnalyticsProperty.STORY_ID]: number;
    [AnalyticsProperty.CATEGORY]?: StoryCategory;
  };
  [AnalyticsEvent.STORY_UNVOTED]: {
    [AnalyticsProperty.STORY_ID]: number;
  };
  [AnalyticsEvent.STORY_BOOKMARKED]: {
    [AnalyticsProperty.STORY_ID]: number;
  };
  [AnalyticsEvent.BOOKMARK_REMOVED]: {
    [AnalyticsProperty.STORY_ID]: number;
  };
  [AnalyticsEvent.STORY_SHARED]: {
    [AnalyticsProperty.STORY_ID]: number;
    [AnalyticsProperty.SHARE_METHOD]: "native" | "clipboard" | "header_menu";
  };
  [AnalyticsEvent.STORY_HIDDEN]: {
    [AnalyticsProperty.STORY_ID]: number;
  };
  [AnalyticsEvent.STORY_MARKED_READ]: {
    [AnalyticsProperty.STORY_ID]: number;
  };
  [AnalyticsEvent.STORY_MARKED_UNREAD]: {
    [AnalyticsProperty.STORY_ID]: number;
  };
  [AnalyticsEvent.NEXT_NEW_COMMENT_TAPPED]: {
    [AnalyticsProperty.STORY_ID]: number;
    [AnalyticsProperty.NEW_COMMENT_COUNT]: number;
  };
  [AnalyticsEvent.MUTE_ADDED]: {
    [AnalyticsProperty.MUTE_KIND]: "keyword" | "domain";
    [AnalyticsProperty.MUTE_SOURCE]: "story_card" | "story_detail" | "settings";
  };
  [AnalyticsEvent.MUTE_REMOVED]: {
    [AnalyticsProperty.MUTE_KIND]: "keyword" | "domain";
  };
  [AnalyticsEvent.STORY_FLAGGED]: {
    [AnalyticsProperty.STORY_ID]: number;
  };
  [AnalyticsEvent.COMMENT_VIEWED]: {
    [AnalyticsProperty.COMMENT_ID]: number;
    [AnalyticsProperty.DEPTH_LEVEL]: number;
  };
  [AnalyticsEvent.COMMENT_COLLAPSED]: {
    [AnalyticsProperty.COMMENT_ID]: number;
    [AnalyticsProperty.CHILD_COUNT]: number;
  };
  [AnalyticsEvent.COMMENT_LINK_CLICKED]: {
    [AnalyticsProperty.URL]: string;
  };
  [AnalyticsEvent.COMMENT_HIDDEN]: {
    [AnalyticsProperty.COMMENT_ID]: number;
  };
  [AnalyticsEvent.COMMENT_FLAGGED]: {
    [AnalyticsProperty.COMMENT_ID]: number;
  };

  // Submitting & sharing in
  [AnalyticsEvent.STORY_SUBMITTED]: {
    [AnalyticsProperty.SUBMIT_KIND]: "link" | "text";
    [AnalyticsProperty.SUBMIT_SOURCE]: SubmitSource;
  };
  [AnalyticsEvent.SUBMIT_DUPLICATE_FOUND]: {
    [AnalyticsProperty.STORY_ID]: number;
    [AnalyticsProperty.SUBMIT_SOURCE]: SubmitSource;
  };
  [AnalyticsEvent.SHARE_EXTENSION_OPENED]: Record<string, never>;
  [AnalyticsEvent.DISCUSSION_FOUND]: {
    [AnalyticsProperty.DISCUSSION_COUNT]: number;
  };

  // Authentication
  [AnalyticsEvent.LOGIN_INITIATED]: Record<string, never>;
  [AnalyticsEvent.LOGIN_COMPLETED]: {
    [AnalyticsProperty.USER_KARMA]?: number;
  };
  [AnalyticsEvent.LOGOUT_TRIGGERED]: Record<string, never>;

  // Settings & Preferences
  [AnalyticsEvent.THEME_CHANGED]: {
    from_theme: "light" | "dark" | "system";
    to_theme: "light" | "dark" | "system";
  };
  [AnalyticsEvent.SETTINGS_VIEWED]: Record<string, never>;
  [AnalyticsEvent.TEXT_SIZE_CHANGED]: {
    from_size: TextSize;
    to_size: TextSize;
  };

  // Pro
  [AnalyticsEvent.PAYWALL_VIEWED]: {
    /** The Pro feature the user tapped, absent when opened from Settings. */
    [AnalyticsProperty.PRO_FEATURE]?: ProFeatureId;
  };
  [AnalyticsEvent.PURCHASE_STARTED]: {
    [AnalyticsProperty.PRO_PLAN]: PlanKind;
  };
  [AnalyticsEvent.PURCHASE_COMPLETED]: {
    [AnalyticsProperty.PRO_PLAN]: PlanKind;
  };
  [AnalyticsEvent.PURCHASE_FAILED]: {
    [AnalyticsProperty.PRO_PLAN]: PlanKind;
  };
  [AnalyticsEvent.PURCHASE_RESTORED]: {
    /** Whether the restore found an active Pro entitlement. */
    is_pro: boolean;
  };

  [AnalyticsEvent.REPLIES_VIEWED]: {
    [AnalyticsProperty.REPLY_COUNT]: number;
    [AnalyticsProperty.UNREAD_REPLY_COUNT]: number;
  };
  [AnalyticsEvent.REPLY_NOTIFICATIONS_ENABLED]: Record<string, never>;
  [AnalyticsEvent.REPLY_NOTIFICATIONS_DISABLED]: Record<string, never>;
  [AnalyticsEvent.NOTIFICATION_OPENED]: {
    /** What sent it: "reply", later others. */
    [AnalyticsProperty.NOTIFICATION_KIND]: string;
  };
  [AnalyticsEvent.SUMMARY_REQUESTED]: {
    [AnalyticsProperty.STORY_ID]: number;
    [AnalyticsProperty.COMMENT_COUNT]: number;
    [AnalyticsProperty.SUMMARY_SOURCE]: SummarySource;
  };
  [AnalyticsEvent.SUMMARY_VIEWED]: {
    [AnalyticsProperty.STORY_ID]: number;
    [AnalyticsProperty.COMMENT_COUNT]: number;
  };
  [AnalyticsEvent.SUMMARY_COMMENT_LINK_TAPPED]: {
    [AnalyticsProperty.STORY_ID]: number;
    [AnalyticsProperty.COMMENT_ID]: number;
  };

  // Widget Interactions
  // Offline
  [AnalyticsEvent.OFFLINE_BANNER_SHOWN]: Record<string, never>;

  [AnalyticsEvent.WIDGET_TAPPED]: {
    [AnalyticsProperty.WIDGET_SIZE]: WidgetSize;
    [AnalyticsProperty.WIDGET_KIND]?: WidgetKind;
    [AnalyticsProperty.CATEGORY]?: StoryCategory;
    /** Absent for header and background taps. */
    [AnalyticsProperty.STORY_ID]?: number;
  };
}

/**
 * Get app metadata for super properties
 */
export function getAppMetadata() {
  return {
    [AnalyticsProperty.APP_VERSION]:
      Application.nativeApplicationVersion || "unknown",
    [AnalyticsProperty.PLATFORM]: Platform.OS,
  };
}

/**
 * Type-safe wrapper for PostHog capture
 *
 * @example
 * ```ts
 * const posthog = usePostHog();
 * trackEvent(posthog, AnalyticsEvent.STORY_VIEWED, {
 *   story_id: 123,
 *   category: 'top'
 * });
 * ```
 */
export function trackEvent<E extends keyof EventProperties>(
  posthog: ReturnType<typeof usePostHog>,
  event: E,
  properties?: EventProperties[E]
) {
  if (!posthog) {
    console.warn("[Analytics] PostHog not initialized");
    return;
  }

  try {
    posthog.capture(event, properties);
  } catch (error) {
    reportError(error, { operation: "trackEvent", event });
  }
}

/**
 * Identify user with PostHog
 */
export function identifyUser(
  posthog: ReturnType<typeof usePostHog>,
  username: string,
  properties?: {
    [AnalyticsProperty.USER_KARMA]?: number;
    [AnalyticsProperty.ACCOUNT_AGE_DAYS]?: number;
  }
) {
  if (!posthog) {
    console.warn("[Analytics] PostHog not initialized");
    return;
  }

  try {
    posthog.identify(username, properties);
  } catch (error) {
    reportError(error, { operation: "identifyUser" });
  }
}

/**
 * Reset user identity (call on logout)
 */
export function resetUser(posthog: ReturnType<typeof usePostHog>) {
  if (!posthog) {
    console.warn("[Analytics] PostHog not initialized");
    return;
  }

  try {
    posthog.reset();
  } catch (error) {
    reportError(error, { operation: "resetUser" });
  }
}
