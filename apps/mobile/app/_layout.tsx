import * as Sentry from "@sentry/react-native";
import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { PostHogProvider, usePostHog } from "posthog-react-native";
import "react-native-reanimated";
import { useEffect } from "react";

import { useHeaderOptions } from "@/components/navigation/header-options";
import { useNavigationTheme } from "@/components/navigation/navigation-theme";
import { ColorSchemeProvider } from "@/contexts/color-scheme-context";
import { HNAuthProvider, useHNAuth } from "@/contexts/hn-auth-context";
import { useAppPrefetch } from "@/hooks/use-app-prefetch";
import { useTheme } from "@/hooks/use-theme";
import { useWidgetAnalytics } from "@/hooks/use-widget-analytics";
import { useWidgetSync } from "@/hooks/use-widget-sync";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import { getAppMetadata } from "@/lib/analytics/tracking";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  sendDefaultPii: true,
  enableLogs: true,
  environment: __DEV__ ? "development" : "production",
  enabled: !__DEV__,
});

export const unstable_settings = {
  anchor: "(tabs)",
};

// The `meta.invalidates` contract is declared in `@/types/react-query`.

// Held until ColorSchemeProvider resolves the saved appearance, then faded out
// over a root view already painted in the page colour.
void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 250 });

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: true,
    },
    // HN writes (comment, delete, flag) are not safe to repeat blindly; a failed
    // one is reported and the user decides. Reads above keep their retries.
    mutations: {
      retry: false,
    },
  },
  mutationCache: new MutationCache({
    onSuccess: (_data, _variables, _context, mutation) => {
      // Only invalidate the keys a mutation explicitly declares. Mutations that
      // manage their own invalidation in onSuccess/onSettled (bookmarks, hidden
      // items, blocked users, comments) simply declare nothing here.
      const invalidates = mutation.options.meta?.invalidates;
      invalidates?.forEach((queryKey) =>
        queryClient.invalidateQueries({ queryKey })
      );
    },
  }),
});

function RootLayoutContent() {
  const { scheme, colors } = useTheme();
  const { isAuthenticated } = useHNAuth();
  const posthog = usePostHog();
  const navigationTheme = useNavigationTheme();
  const detailHeader = { ...useHeaderOptions("inline"), headerShown: true };
  const sheetHeader = useHeaderOptions("sheet");
  useWidgetAnalytics();
  useWidgetSync();

  useAppPrefetch();

  useEffect(() => {
    if (posthog) {
      const metadata = getAppMetadata();

      posthog.register({
        ...metadata,
        [AnalyticsProperty.COLOR_SCHEME]: scheme,
        [AnalyticsProperty.IS_AUTHENTICATED]: isAuthenticated,
      });
    }
  }, [posthog, scheme, isAuthenticated]);

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ title: "Hacker Reader" }} />
        <Stack.Screen name="story/[id]" options={detailHeader} />
        <Stack.Screen name="user/[id]" options={detailHeader} />
        <Stack.Screen name="user/[id]/submissions" options={detailHeader} />
        <Stack.Screen
          name="auth/login"
          options={{
            ...sheetHeader,
            sheetAllowedDetents: [0.8],
            headerTitle: "Sign in to Hacker News",
          }}
        />
      </Stack>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}

export default Sentry.wrap(function RootLayout() {
  return (
    <PostHogProvider
      apiKey={process.env.EXPO_PUBLIC_POSTHOG_API_KEY!}
      options={{
        host: process.env.EXPO_PUBLIC_POSTHOG_HOST!,
        enableSessionReplay: true,
        disabled: __DEV__,
      }}
      autocapture={{
        captureTouches: true,
        // expo-router never exposes NavigationContainer; PostHog's screen
        // tracker calls useNavigation outside a navigator and LogBoxes.
        captureScreens: false,
      }}
      debug={__DEV__}
    >
      <QueryClientProvider client={queryClient}>
        <ColorSchemeProvider>
          <HNAuthProvider>
            <RootLayoutContent />
          </HNAuthProvider>
        </ColorSchemeProvider>
      </QueryClientProvider>
    </PostHogProvider>
  );
});
