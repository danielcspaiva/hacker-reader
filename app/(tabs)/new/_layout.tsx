import { useThemeColor } from "@/hooks/use-theme-color";
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
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "New Stories",
          headerLargeTitleStyle: {
            color: textColor,
          },
        }}
      />
    </Stack>
  );
}
