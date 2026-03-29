import { Colors } from "@/constants/theme";
import { useColorSchemeContext } from "@/contexts/color-scheme-context";
import { useThemeColor } from "@/hooks/use-theme-color";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import Stack from "expo-router/stack";
import type { ComponentProps } from "react";

type StackScreenOptions = ComponentProps<typeof Stack.Screen>["options"];

interface TabStackLayoutProps {
  screens: {
    name: string;
    title?: string;
    options?: StackScreenOptions;
  }[];
  screenOptions?: StackScreenOptions;
}

export function TabStackLayout({ screens, screenOptions }: TabStackLayoutProps) {
  const { colorScheme, colorPalette } = useColorSchemeContext();
  const textColor = useThemeColor({}, "tint");
  const backgroundColor =
    colorScheme === "dark"
      ? Colors.dark[colorPalette].background
      : Colors.light[colorPalette].background;

  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerLargeTitle: true,
        headerLargeTitleShadowVisible: false,
        headerTintColor: textColor,
        headerBlurEffect: isLiquidGlassAvailable() ? "none" : "systemMaterial",
        headerStyle: {
          backgroundColor: isLiquidGlassAvailable()
            ? "transparent"
            : backgroundColor,
        },
        ...screenOptions,
      }}
    >
      {screens.map((screen) => (
        <Stack.Screen
          key={screen.name}
          name={screen.name}
          options={{
            title: screen.title,
            headerLargeTitleStyle: {
              color: textColor,
            },
            ...screen.options,
          }}
        />
      ))}
    </Stack>
  );
}
