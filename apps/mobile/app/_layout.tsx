import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { Colors } from "@/constants/theme";
import { ColorSchemeProvider, useColorSchemeContext } from "@/contexts/color-scheme-context";
import { HNAuthProvider } from "@/contexts/hn-auth-context";

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
            backgroundColor: colorScheme === "dark" ? Colors.dark[colorPalette].background : Colors.light[colorPalette].background,
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
            headerLargeTitle: isLiquidGlassAvailable() ? true : false,
            headerLargeTitleShadowVisible: false,
            headerLargeTitleStyle: {
              color:
                colorScheme === "dark"
                  ? Colors.dark[colorPalette].background
                  : Colors.light[colorPalette].background,
              fontSize: 1,
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
    <QueryClientProvider client={queryClient}>
      <ColorSchemeProvider>
        <HNAuthProvider>
          <RootLayoutContent />
        </HNAuthProvider>
      </ColorSchemeProvider>
    </QueryClientProvider>
  );
}
