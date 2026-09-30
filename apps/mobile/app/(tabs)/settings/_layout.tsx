import { Stack } from "expo-router";

import { LargeTitleStack } from "@/components/navigation/large-title-stack";

export default function Layout() {
  return (
    <LargeTitleStack>
      <Stack.Screen name="index" options={{ title: "Settings" }} />
      <Stack.Screen name="app-icon" options={{ title: "App Icon" }} />
      <Stack.Screen name="digest" options={{ title: "Daily Digest" }} />
      <Stack.Screen name="blocked-users" options={{ title: "Blocked Users" }} />
      <Stack.Screen name="alerts" options={{ title: "Alerts" }} />
      <Stack.Screen name="mutes" options={{ title: "Muted Words & Sites" }} />
    </LargeTitleStack>
  );
}
