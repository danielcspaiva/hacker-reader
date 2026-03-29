import { ThemeProvider } from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { router } from "expo-router";
import Stack from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import { PostHogProvider, usePostHog } from "posthog-react-native";
import { useEffect } from "react";
import { Pressable } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import {
  ColorSchemeProvider,
  useColorSchemeContext,
} from "@/contexts/color-scheme-context";
import { HNAuthProvider, useHNAuth } from "@/contexts/hn-auth-context";
import { useAppPrefetch } from "@/hooks/use-app-prefetch";
import { useThemeColor } from "@/hooks/use-theme-color";
import { queryClient } from "@/lib/query-client";
import { buildNavigationTheme } from "@/constants/navigation-themes";
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
  initialRouteName: "(tabs)",
};


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

  const navigationTheme = buildNavigationTheme(colorScheme, colorPalette);

  return (
    <ThemeProvider value={navigationTheme}>
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
