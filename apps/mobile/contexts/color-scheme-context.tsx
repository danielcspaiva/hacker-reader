import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, use, useEffect, useState, useRef } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import UserInterfaceStyle from "react-native-user-interface-style";
import { usePostHog } from "posthog-react-native";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { trackEvent } from "@/lib/analytics/tracking";

type ColorSchemePreference = "system" | "light" | "dark";
type ColorScheme = "light" | "dark";
type ColorPalette = "lights-out";

interface ColorSchemeContextType {
  colorScheme: ColorScheme;
  preference: ColorSchemePreference;
  setPreference: (preference: ColorSchemePreference) => void;
  colorPalette: ColorPalette;
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
  const colorPalette: ColorPalette = "lights-out";
  const posthog = usePostHog();
  const isFirstLoad = useRef(true);

  // Load preferences from storage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((schemeValue) => {
      if (
        schemeValue === "light" ||
        schemeValue === "dark" ||
        schemeValue === "system"
      ) {
        setPreferenceState(schemeValue);
      }
      setIsLoaded(true);
    });
  }, []);

  const setPreference = (newPreference: ColorSchemePreference) => {
    // Track theme change (skip tracking on first load)
    if (!isFirstLoad.current) {
      trackEvent(posthog, AnalyticsEvent.THEME_CHANGED, {
        from_theme: preference,
        to_theme: newPreference,
      });
    }
    isFirstLoad.current = false;

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

  // Sync iOS interface style with user's theme preference
  useEffect(() => {
    // When preference is 'system', use 'unspecified' to follow system appearance
    // Otherwise, force the user's chosen light/dark preference
    const styleToSet = preference === "system" ? "unspecified" : colorScheme;
    UserInterfaceStyle.setStyle(styleToSet);
  }, [colorScheme, preference]);

  // Don't render until we've loaded the preferences
  if (!isLoaded) {
    return null;
  }

  return (
    <ColorSchemeContext.Provider
      value={{ colorScheme, preference, setPreference, colorPalette }}
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
