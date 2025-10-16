import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Jobs",
        }}
      />
    </Stack>
  );
}
