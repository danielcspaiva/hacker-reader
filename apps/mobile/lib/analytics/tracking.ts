/**
 * PostHog Analytics Tracking Utilities
 *
 * Provides typed wrapper functions for PostHog event tracking.
 * All tracking functions are type-safe and follow naming conventions.
 */

import { usePostHog } from "posthog-react-native";
import type { Category } from "@/components/category-filter";
import { AnalyticsEvent } from "./posthog-events";
import { AnalyticsProperty } from "./posthog-properties";
import * as Application from "expo-application";
import { Platform } from "react-native";

export type WidgetSize = "small" | "medium" | "large";

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
    [AnalyticsProperty.CATEGORY]?: Category;
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
    [AnalyticsProperty.FROM_CATEGORY]: Category;
    [AnalyticsProperty.TO_CATEGORY]: Category;
  };
  [AnalyticsEvent.INFINITE_SCROLL_TRIGGERED]: {
    [AnalyticsProperty.CATEGORY]: Category;
    [AnalyticsProperty.PAGE_NUMBER]: number;
  };

  // Search
  [AnalyticsEvent.SEARCH_PERFORMED]: {
    [AnalyticsProperty.QUERY]: string;
    [AnalyticsProperty.RESULTS_COUNT]: number;
  };
  [AnalyticsEvent.SEARCH_RESULT_CLICKED]: {
    [AnalyticsProperty.QUERY]: string;
    [AnalyticsProperty.STORY_ID]: number;
    [AnalyticsProperty.RESULT_POSITION]: number;
  };

  // Engagement Actions
  [AnalyticsEvent.STORY_UPVOTED]: {
    [AnalyticsProperty.STORY_ID]: number;
    [AnalyticsProperty.CATEGORY]?: Category;
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
    [AnalyticsProperty.SHARE_METHOD]: "native" | "clipboard";
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

  // Widget Interactions
  [AnalyticsEvent.WIDGET_ADDED]: {
    [AnalyticsProperty.WIDGET_KIND]: string;
    [AnalyticsProperty.WIDGET_SIZE]: WidgetSize;
  };
  [AnalyticsEvent.WIDGET_TAPPED]: {
    [AnalyticsProperty.WIDGET_SIZE]: WidgetSize;
    [AnalyticsProperty.STORY_ID]?: number;
    [AnalyticsProperty.WIDGET_KIND]?: string;
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
export function trackEvent<E extends AnalyticsEvent>(
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
    console.error(`[Analytics] Error tracking ${event}:`, error);
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
    console.error("[Analytics] Error identifying user:", error);
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
    console.error("[Analytics] Error resetting user:", error);
  }
}

/**
 * Register super properties (set once per session)
 */
export function registerSuperProperties(
  posthog: ReturnType<typeof usePostHog>,
  properties: {
    [AnalyticsProperty.COLOR_SCHEME]?: "light" | "dark";
    [AnalyticsProperty.IS_AUTHENTICATED]?: boolean;
    [AnalyticsProperty.HAS_WIDGET_INSTALLED]?: boolean;
  }
) {
  if (!posthog) {
    console.warn("[Analytics] PostHog not initialized");
    return;
  }

  try {
    posthog.register(properties);
  } catch (error) {
    console.error("[Analytics] Error registering super properties:", error);
  }
}
