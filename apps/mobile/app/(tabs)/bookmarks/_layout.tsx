import { Colors } from "@/constants/theme";
import { useColorSchemeContext } from "@/contexts/color-scheme-context";
import { useThemeColor } from "@/hooks/use-theme-color";
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Stack } from "expo-router";

export default function Layout() {
  const { colorScheme, colorPalette } = useColorSchemeContext();
  const textColor = useThemeColor({}, "tint");
  const backgroundColor = colorScheme === "dark" ? Colors.dark[colorPalette].background : Colors.light[colorPalette].background;
  
  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerLargeTitle: true,
        headerLargeTitleShadowVisible: false,
        headerTintColor: textColor,
        headerBlurEffect: isLiquidGlassAvailable() ? "none" : "systemMaterial",
        headerStyle: {
          backgroundColor: isLiquidGlassAvailable() ? "transparent" : backgroundColor,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Bookmarks",
          headerLargeTitleStyle: {
            color: textColor,
          },
        }}
      />
    </Stack>
  );
}
