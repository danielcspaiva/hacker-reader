import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "expo-router/react-navigation";
import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
  type QueryKey,
} from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PostHogProvider, usePostHog } from "posthog-react-native";
import { useEffect } from "react";
import { Pressable } from "react-native";
import "react-native-reanimated";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import {
  ColorSchemeProvider,
  useColorSchemeContext,
} from "@/contexts/color-scheme-context";
import { HNAuthProvider, useHNAuth } from "@/contexts/hn-auth-context";
import { useAppPrefetch } from "@/hooks/use-app-prefetch";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useWidgetAnalytics } from "@/hooks/use-widget-analytics";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import { getAppMetadata } from "@/lib/analytics/tracking";
import * as Sentry from "@sentry/react-native";
import { isLiquidGlassAvailable } from "expo-glass-effect";

// Initialize Sentry (but only send data in production via `enabled` flag)
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs in production
  enableLogs: true,

  // Set environment
  environment: __DEV__ ? "development" : "production",

  // Only send errors in production
  enabled: !__DEV__,
});

export const unstable_settings = {
  anchor: "(tabs)",
};

// Let mutations declare exactly which query keys they invalidate via
// `meta.invalidates`, instead of blanket-invalidating every query in the app.
declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      invalidates?: QueryKey[];
    };
  }
}

// Create a client with declarative, scoped mutation invalidation
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes - shorter to ensure fresher data
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: true, // Always refetch when app comes to foreground
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
  const { colorScheme, colorPalette } = useColorSchemeContext();
  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const { isAuthenticated } = useHNAuth();
  const posthog = usePostHog();
  useWidgetAnalytics();

  // Prefetch all categories on app open for instant category switching
  useAppPrefetch();

  // Register super properties when app state changes
  useEffect(() => {
    if (posthog) {
      const metadata = getAppMetadata();

      posthog.register({
        ...metadata,
        [AnalyticsProperty.COLOR_SCHEME]: colorScheme,
        [AnalyticsProperty.IS_AUTHENTICATED]: isAuthenticated,
      });
    }
  }, [posthog, colorScheme, isAuthenticated]);

  const customDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: Colors.dark[colorPalette].background,
      card: Colors.dark[colorPalette].background,
      text: Colors.dark[colorPalette].text,
      border: Colors.dark[colorPalette].border,
    },
  };

  const customLightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: Colors.light[colorPalette].background,
      card: Colors.light[colorPalette].background,
      text: Colors.light[colorPalette].text,
      border: Colors.light[colorPalette].border,
    },
  };

  return (
    <ThemeProvider
      value={colorScheme === "dark" ? customDarkTheme : customLightTheme}
    >
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor:
              colorScheme === "dark"
                ? Colors.dark[colorPalette].background
                : Colors.light[colorPalette].background,
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="story/[id]"
          options={{
            headerShown: true,
            headerTransparent: true,
            headerBackButtonDisplayMode: "minimal",
            headerLargeTitle: true,
            headerLargeTitleShadowVisible: false,
            headerBlurEffect: isLiquidGlassAvailable()
              ? "none"
              : "systemMaterial",
            headerLargeTitleStyle: {
              color:
                colorScheme === "dark"
                  ? Colors.dark[colorPalette].background
                  : Colors.light[colorPalette].background,
              fontSize: 1,
            },
            headerTintColor:
              colorScheme === "dark"
                ? Colors.dark[colorPalette].text
                : Colors.light[colorPalette].text,
            headerStyle: {
              backgroundColor: isLiquidGlassAvailable()
                ? "transparent"
                : colorScheme === "dark"
                  ? Colors.dark[colorPalette].background
                  : Colors.light[colorPalette].background,
            },
          }}
        />
        <Stack.Screen
          name="auth/login"
          options={{
            presentation: isLiquidGlassAvailable() ? "formSheet" : "modal",
            sheetGrabberVisible: false,
            sheetAllowedDetents: [0.8],
            headerShown: true,
            headerTransparent: false,
            headerStyle: {
              backgroundColor: isLiquidGlassAvailable()
                ? "transparent"
                : backgroundColor,
            },
            headerTitle: "Sign in to Hacker News",
            contentStyle: {
              backgroundColor: isLiquidGlassAvailable()
                ? "transparent"
                : backgroundColor,
            },
            headerRight: () => (
              <Pressable style={{ padding: 8 }} onPress={() => router.back()}>
                <IconSymbol
                  name="xmark"
                  size={20}
                  color={textColor}
                  weight="light"
                />
              </Pressable>
            ),
          }}
        />
        <Stack.Screen
          name="auth/guidelines"
          options={{
            presentation: isLiquidGlassAvailable() ? "formSheet" : "modal",
            sheetGrabberVisible: false,
            headerShown: true,
            headerTransparent: false,
            sheetAllowedDetents: [0.9],
            headerStyle: {
              backgroundColor: isLiquidGlassAvailable()
                ? "transparent"
                : backgroundColor,
            },
            headerTitle: "Hacker News Guidelines",
            contentStyle: {
              backgroundColor: isLiquidGlassAvailable()
                ? "transparent"
                : backgroundColor,
            },
            headerRight: () => (
              <Pressable style={{ padding: 8 }} onPress={() => router.back()}>
                <IconSymbol
                  name="xmark"
                  size={20}
                  color={textColor}
                  weight="light"
                />
              </Pressable>
            ),
          }}
        />
      </Stack>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
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
      autocapture
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
