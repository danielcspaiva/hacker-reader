/**
 * Analytics Hook
 *
 * React hook that provides typed analytics tracking functions.
 * Wraps PostHog with type-safe event tracking.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const analytics = useAnalytics();
 *
 *   const handleClick = () => {
 *     analytics.track(AnalyticsEvent.STORY_VIEWED, {
 *       story_id: 123,
 *       category: 'top'
 *     });
 *   };
 * }
 * ```
 */

import { usePostHog } from "posthog-react-native";
import { useCallback } from "react";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import {
  trackEvent,
  identifyUser,
  resetUser,
  registerSuperProperties,
  type EventProperties,
} from "@/lib/analytics/tracking";

export interface Analytics {
  /**
   * Track a typed analytics event
   */
  track: <E extends AnalyticsEvent>(
    event: E,
    properties?: EventProperties[E]
  ) => void;

  /**
   * Identify the current user
   */
  identify: (
    username: string,
    properties?: {
      [AnalyticsProperty.USER_KARMA]?: number;
      [AnalyticsProperty.ACCOUNT_AGE_DAYS]?: number;
    }
  ) => void;

  /**
   * Reset user identity (call on logout)
   */
  reset: () => void;

  /**
   * Register properties that persist across all events
   */
  registerSuper: (properties: {
    [AnalyticsProperty.COLOR_SCHEME]?: "light" | "dark";
    [AnalyticsProperty.IS_AUTHENTICATED]?: boolean;
    [AnalyticsProperty.HAS_WIDGET_INSTALLED]?: boolean;
  }) => void;

  /**
   * Check if PostHog is initialized
   */
  isReady: boolean;
}

/**
 * Hook for analytics tracking with PostHog
 */
export function useAnalytics(): Analytics {
  const posthog = usePostHog();

  const track = useCallback(
    <E extends AnalyticsEvent>(
      event: E,
      properties?: EventProperties[E]
    ) => {
      trackEvent(posthog, event, properties);
    },
    [posthog]
  );

  const identify = useCallback(
    (
      username: string,
      properties?: {
        [AnalyticsProperty.USER_KARMA]?: number;
        [AnalyticsProperty.ACCOUNT_AGE_DAYS]?: number;
      }
    ) => {
      identifyUser(posthog, username, properties);
    },
    [posthog]
  );

  const reset = useCallback(() => {
    resetUser(posthog);
  }, [posthog]);

  const registerSuper = useCallback(
    (properties: {
      [AnalyticsProperty.COLOR_SCHEME]?: "light" | "dark";
      [AnalyticsProperty.IS_AUTHENTICATED]?: boolean;
      [AnalyticsProperty.HAS_WIDGET_INSTALLED]?: boolean;
    }) => {
      registerSuperProperties(posthog, properties);
    },
    [posthog]
  );

  return {
    track,
    identify,
    reset,
    registerSuper,
    isReady: !!posthog,
  };
}
