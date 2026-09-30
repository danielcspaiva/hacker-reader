import { useLocalSearchParams } from "expo-router";

import { UserSubmissionsList } from "@/components/user-submissions-list";

export default function UserSubmissionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <UserSubmissionsList userId={id ?? null} title={`${id}'s Submissions`} />
  );
}
