import { Stack } from "expo-router";

import { LargeTitleStack } from "@/components/navigation/large-title-stack";

export default function Layout() {
  return (
    <LargeTitleStack>
      <Stack.Screen name="index" options={{ title: "Profile" }} />
      <Stack.Screen name="submissions" />
      <Stack.Screen name="replies" options={{ title: "Replies" }} />
    </LargeTitleStack>
  );
}
