import { SubmissionsList } from "@/components/submissions-list";
import { useHNAuth } from "@/contexts/hn-auth-context";
import Stack from "expo-router/stack";

export default function SubmissionsScreen() {
  const { username } = useHNAuth();

  return (
    <>
      <Stack.Screen options={{ title: "Submissions" }} />
      <SubmissionsList userId={username} />
    </>
  );
}
