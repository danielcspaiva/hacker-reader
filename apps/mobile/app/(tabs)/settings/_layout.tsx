import { useThemeColor } from "@/hooks/use-theme-color";
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Stack } from "expo-router";

export default function Layout() {
  const textColor = useThemeColor({}, "tint");
  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerLargeTitle: true,
        headerLargeTitleShadowVisible: false,
        headerTintColor: textColor,
        headerBlurEffect: isLiquidGlassAvailable() ? "none" : "systemMaterial",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Settings",
          headerLargeTitleStyle: {
            color: textColor,
          },
        }}
      />
      <Stack.Screen
        name="login"
        options={{
          presentation: "formSheet",
          title: "Login to Hacker News",
          headerLargeTitle: false,
          headerTransparent: false,
          headerBlurEffect: "systemMaterial",
        }}
      />
    </Stack>
  );
}
