import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { usePostHog } from "posthog-react-native";
import { createContext, use, useEffect, useState } from "react";
import {
  Appearance,
  useColorScheme as useSystemColorScheme,
} from "react-native";

import { Colors, type ColorScheme } from "@/constants/theme";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { trackEvent } from "@/lib/analytics/tracking";

type ColorSchemePreference = "system" | "light" | "dark";

interface ColorSchemeContextType {
  colorScheme: ColorScheme;
  preference: ColorSchemePreference;
  setPreference: (preference: ColorSchemePreference) => void;
}

const ColorSchemeContext = createContext<ColorSchemeContextType | undefined>(
  undefined
);

const STORAGE_KEY = "@hn_client_color_scheme";

export function ColorSchemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const systemColorScheme = useSystemColorScheme();
  const [preference, setPreferenceState] =
    useState<ColorSchemePreference>("system");
  const [isLoaded, setIsLoaded] = useState(false);
  const posthog = usePostHog();

  // Load preferences from storage on mount
  // The splash stays up until this resolves, so a storage failure must still
  // finish loading (falling back to "system") rather than hang on the splash.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((schemeValue) => {
        if (
          schemeValue === "light" ||
          schemeValue === "dark" ||
          schemeValue === "system"
        ) {
          setPreferenceState(schemeValue);
        }
      })
      .catch(() => undefined)
      .finally(() => setIsLoaded(true));
  }, []);

  const setPreference = (newPreference: ColorSchemePreference) => {
    trackEvent(posthog, AnalyticsEvent.THEME_CHANGED, {
      from_theme: preference,
      to_theme: newPreference,
    });

    setPreferenceState(newPreference);
    AsyncStorage.setItem(STORAGE_KEY, newPreference);
  };

  // Determine actual color scheme based on preference.
  // useColorScheme() can return "unspecified"/null (SDK 56 / RN 0.85), so map
  // anything that isn't explicitly "dark" to "light".
  const colorScheme: ColorScheme =
    preference === "system"
      ? systemColorScheme === "dark"
        ? "dark"
        : "light"
      : preference;

  useEffect(() => {
    // When preference is 'system', use 'unspecified' to follow system appearance
    // Otherwise, force the user's chosen light/dark preference
    Appearance.setColorScheme(
      preference === "system" ? "unspecified" : colorScheme
    );
  }, [colorScheme, preference]);

  // The root view shows behind every screen transition and under the splash
  // fade, so it tracks the resolved page colour; the splash lifts only once the
  // app can paint in the right scheme.
  useEffect(() => {
    if (!isLoaded) return;
    void SystemUI.setBackgroundColorAsync(Colors[colorScheme].background);
    SplashScreen.hide();
  }, [isLoaded, colorScheme]);

  // Don't render until we've loaded the preferences
  if (!isLoaded) {
    return null;
  }

  return (
    <ColorSchemeContext.Provider
      value={{ colorScheme, preference, setPreference }}
    >
      {children}
    </ColorSchemeContext.Provider>
  );
}

export function useColorSchemeContext() {
  const context = use(ColorSchemeContext);
  if (context === undefined) {
    throw new Error(
      "useColorSchemeContext must be used within a ColorSchemeProvider"
    );
  }
  return context;
}
