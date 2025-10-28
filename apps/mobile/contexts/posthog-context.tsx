import Constants from 'expo-constants';
import { PostHog } from 'posthog-react-native';
import { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

interface PostHogContextValue {
  client: PostHog | null;
  isReady: boolean;
}

const PostHogContext = createContext<PostHogContextValue>({
  client: null,
  isReady: false,
});

export const usePostHog = () => {
  const context = useContext(PostHogContext);
  if (!context) {
    throw new Error('usePostHog must be used within PostHogProvider');
  }
  return context;
};

interface PostHogProviderProps {
  children: React.ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const [client, setClient] = useState<PostHog | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initializePostHog = async () => {
      try {
        // Get configuration from environment variables
        const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
        const host = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';
        const isDisabled = process.env.EXPO_PUBLIC_ANALYTICS_DISABLED === 'true';

        // Skip initialization if no API key or explicitly disabled
        if (!apiKey || isDisabled) {
          console.log('[PostHog] Analytics disabled - no API key or explicitly disabled');
          setIsReady(true);
          return;
        }

        // Initialize PostHog
        const posthog = new PostHog(apiKey, {
          host,
          // Privacy
          flushAt: 20, // Batch events for efficiency
          flushInterval: 30, // Flush every 30 seconds
        });

        // Set super properties (included with every event)
        posthog.register({
          platform: Platform.OS,
          app_version: Constants.expoConfig?.version || '1.0.0',
          ...(Constants.expoConfig?.sdkVersion && { expo_sdk_version: Constants.expoConfig.sdkVersion }),
        });

        setClient(posthog);
        setIsReady(true);

        console.log('[PostHog] Initialized successfully');
      } catch (error) {
        console.error('[PostHog] Failed to initialize:', error);
        setIsReady(true); // Mark as ready even on error to not block app
      }
    };

    initializePostHog();
  }, []);

  return (
    <PostHogContext.Provider
      value={{
        client,
        isReady,
      }}
    >
      {children}
    </PostHogContext.Provider>
  );
}
