import { Stack } from "expo-router";

import { LargeTitleStack } from "@/components/navigation/large-title-stack";

export default function Layout() {
  return (
    <LargeTitleStack>
      <Stack.Screen name="index" options={{ title: "Top Stories" }} />
      <Stack.Screen name="[category]" options={{ headerShown: false }} />
    </LargeTitleStack>
  );
}
