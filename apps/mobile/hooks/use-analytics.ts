import type { EventName } from '@/constants/analytics-events';
import { usePostHog } from '@/contexts/posthog-context';

/**
 * Analytics hook for type-safe event tracking
 *
 * Provides a simple interface for tracking events with PostHog.
 * Automatically handles cases where PostHog is not initialized or user has opted out.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const analytics = useAnalytics();
 *
 *   const handleClick = () => {
 *     analytics.track('story_opened', {
 *       story_id: 123,
 *       story_title: 'Hello World'
 *     });
 *   };
 * }
 * ```
 */
export function useAnalytics() {
  const { client, isReady } = usePostHog();

  /**
   * Track an event with optional properties
   *
   * @param eventName - The name of the event to track
   * @param properties - Optional properties to attach to the event
   */
  const track = (eventName: EventName, properties?: Record<string, any>) => {
    if (!isReady || !client) {
      if (__DEV__) {
        console.log('[Analytics] Not ready or client not initialized');
      }
      return;
    }

    try {
      client.capture(eventName, properties);

      if (__DEV__) {
        console.log('[Analytics] Event tracked:', eventName, properties);
      }
    } catch (error) {
      console.error('[Analytics] Failed to track event:', eventName, error);
    }
  };

  /**
   * Identify a user with a unique ID
   *
   * @param userId - Unique identifier for the user
   * @param properties - Optional user properties
   */
  const identify = (userId: string, properties?: Record<string, any>) => {
    if (!isReady || !client) {
      return;
    }

    try {
      client.identify(userId, properties);

      if (__DEV__) {
        console.log('[Analytics] User identified:', userId, properties);
      }
    } catch (error) {
      console.error('[Analytics] Failed to identify user:', error);
    }
  };

  /**
   * Set super properties (sent with every event)
   *
   * These properties are registered globally and included with all future events.
   * Use for properties like platform, theme, auth status, etc.
   *
   * Note: This uses PostHog's register() which sets super properties, NOT person properties.
   * Super properties are event-level, person properties are user-level.
   *
   * @param properties - Properties to include with all events
   */
  const setUserProperties = (properties: Record<string, any>) => {
    if (!isReady || !client) {
      return;
    }

    try {
      client.register(properties);

      if (__DEV__) {
        console.log('[Analytics] Super properties set:', properties);
      }
    } catch (error) {
      console.error('[Analytics] Failed to set super properties:', error);
    }
  };

  /**
   * Reset user identity (e.g., on logout)
   */
  const reset = () => {
    if (!isReady || !client) {
      return;
    }

    try {
      client.reset();

      if (__DEV__) {
        console.log('[Analytics] User identity reset');
      }
    } catch (error) {
      console.error('[Analytics] Failed to reset user:', error);
    }
  };

  /**
   * Track a screen view
   *
   * @param screenName - Name of the screen
   * @param properties - Optional properties
   */
  const screen = (screenName: string, properties?: Record<string, any>) => {
    if (!isReady || !client) {
      return;
    }

    try {
      client.screen(screenName, properties);

      if (__DEV__) {
        console.log('[Analytics] Screen viewed:', screenName, properties);
      }
    } catch (error) {
      console.error('[Analytics] Failed to track screen:', error);
    }
  };

  return {
    track,
    identify,
    setUserProperties,
    reset,
    screen,
    isReady,
  };
}
