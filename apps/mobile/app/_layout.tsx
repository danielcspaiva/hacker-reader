import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, usePathname, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import "react-native-reanimated";

import { Colors } from "@/constants/theme";
import {
  ColorSchemeProvider,
  useColorSchemeContext,
} from "@/contexts/color-scheme-context";
import { HNAuthProvider } from "@/contexts/hn-auth-context";
import { PostHogProvider } from "@/contexts/posthog-context";
import { useAnalytics } from "@/hooks/use-analytics";
import { isLiquidGlassAvailable } from "expo-glass-effect";

export const unstable_settings = {
  anchor: "(tabs)",
};

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes - shorter to ensure fresher data
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: true, // Always refetch when app comes to foreground
    },
  },
});

function RootLayoutContent() {
  const { colorScheme, colorPalette } = useColorSchemeContext();
  const analytics = useAnalytics();
  const pathname = usePathname();
  const segments = useSegments();
  const previousPathname = useRef<string | null>(null);

  // Track screen views when pathname changes
  useEffect(() => {
    if (pathname && pathname !== previousPathname.current) {
      // Format screen name from pathname
      const screenName = pathname === '/'
        ? 'Home'
        : pathname
            .split('/')
            .filter(Boolean)
            .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
            .join(' / ');

      analytics.screen(screenName, {
        path: pathname,
        segments: segments.join('/'),
      });

      previousPathname.current = pathname;
    }
  }, [pathname, segments, analytics]);

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
      </Stack>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <PostHogProvider>
      <QueryClientProvider client={queryClient}>
        <ColorSchemeProvider>
          <HNAuthProvider>
            <RootLayoutContent />
          </HNAuthProvider>
        </ColorSchemeProvider>
      </QueryClientProvider>
    </PostHogProvider>
  );
}
