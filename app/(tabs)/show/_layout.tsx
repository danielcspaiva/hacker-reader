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
          title: "Show HN",
          headerLargeTitleStyle: {
            color: textColor,
          },
        }}
      />
    </Stack>
  );
}
