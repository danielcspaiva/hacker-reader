import { LargeTitleStack } from "@/components/navigation/large-title-stack";
import { Stack } from "expo-router";

export default function Layout() {
  return (
    <LargeTitleStack>
      <Stack.Screen name="index" options={{ title: "Profile" }} />
      <Stack.Screen name="submissions" />
    </LargeTitleStack>
  );
}
