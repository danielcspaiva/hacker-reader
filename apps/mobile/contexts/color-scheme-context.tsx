import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import UserInterfaceStyle from "react-native-user-interface-style";

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
    setPreferenceState(newPreference);
    AsyncStorage.setItem(STORAGE_KEY, newPreference);
  };

  // Determine actual color scheme based on preference
  const colorScheme: ColorScheme =
    preference === "system" ? systemColorScheme ?? "light" : preference;

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
  const context = useContext(ColorSchemeContext);
  if (context === undefined) {
    throw new Error(
      "useColorSchemeContext must be used within a ColorSchemeProvider"
    );
  }
  return context;
}
