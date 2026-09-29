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

import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import {
  identifyUser,
  resetUser,
  trackEvent,
  type EventProperties,
} from "@/lib/analytics/tracking";

export interface Analytics {
  /**
   * Track a typed analytics event
   */
  track: <E extends keyof EventProperties>(
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
   * Check if PostHog is initialized
   */
  isReady: boolean;
}

/**
 * Hook for analytics tracking with PostHog
 */
export function useAnalytics(): Analytics {
  const posthog = usePostHog();

  const track = <E extends keyof EventProperties>(
    event: E,
    properties?: EventProperties[E]
  ) => {
    trackEvent(posthog, event, properties);
  };

  const identify = (
    username: string,
    properties?: {
      [AnalyticsProperty.USER_KARMA]?: number;
      [AnalyticsProperty.ACCOUNT_AGE_DAYS]?: number;
    }
  ) => {
    identifyUser(posthog, username, properties);
  };

  const reset = () => {
    resetUser(posthog);
  };

  return {
    track,
    identify,
    reset,
    isReady: !!posthog,
  };
}
