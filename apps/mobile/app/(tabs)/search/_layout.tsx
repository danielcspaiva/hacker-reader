import { useEffect, useRef } from "react";

import { Colors } from "@/constants/theme";
import { useColorSchemeContext } from "@/contexts/color-scheme-context";
import { useThemeColor } from "@/hooks/use-theme-color";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useRouter } from "expo-router";

export default function Layout() {
  const router = useRouter();
  const { colorScheme, colorPalette } = useColorSchemeContext();
  const tintColor = useThemeColor({}, "tint");
  const textColor = useThemeColor({}, "text");
  const placeholderColor = useThemeColor(
    { light: "#9ca3af", dark: "#6b7280" },
    "icon"
  );
  const backgroundColor =
    colorScheme === "dark"
      ? Colors.dark[colorPalette].background
      : Colors.light[colorPalette].background;
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  const handleSearchChange = (event: { nativeEvent: { text: string } }) => {
    const value = event.nativeEvent.text ?? "";
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      router.setParams({ q: value.trim().length > 0 ? value : undefined });
    }, 300);
  };

  return (
    <Stack
      screenOptions={{
        headerTransparent: isLiquidGlassAvailable(),
        headerLargeTitle: true,
        headerLargeTitleShadowVisible: false,
        headerTintColor: tintColor,
        headerBlurEffect: isLiquidGlassAvailable() ? "none" : "systemMaterial",
        headerStyle: {
          backgroundColor: isLiquidGlassAvailable() ? "transparent" : backgroundColor,
        },
        headerSearchBarOptions: {
          headerIconColor: tintColor,
          tintColor,
          textColor,
          hintTextColor: placeholderColor,
          placeholder: "Search stories",
          hideWhenScrolling: false,
          onChangeText: handleSearchChange,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Search",
          headerLargeTitleStyle: {
            color: tintColor,
          },
        }}
      />
    </Stack>
  );
}
