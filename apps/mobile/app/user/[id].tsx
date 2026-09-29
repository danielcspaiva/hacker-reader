import { router, Stack, useLocalSearchParams } from "expo-router";

import { UserProfileView } from "@/components/user-profile-view";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <>
      <Stack.Screen options={{ title: id || "User Profile" }} />
      <UserProfileView
        userId={id ?? null}
        onOpenSubmissions={() => router.push(`/user/${id}/submissions`)}
      />
    </>
  );
}
