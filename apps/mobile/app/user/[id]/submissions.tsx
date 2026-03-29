import { SubmissionsList } from "@/components/submissions-list";
import { useLocalSearchParams } from "expo-router";
import Stack from "expo-router/stack";

export default function UserSubmissionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <>
      <Stack.Screen
        options={{
          title: `${id}'s Submissions`,
          headerShown: true,
          headerBackButtonDisplayMode: "minimal",
          headerTransparent: true,
        }}
      />
      <SubmissionsList userId={id} />
    </>
  );
}
