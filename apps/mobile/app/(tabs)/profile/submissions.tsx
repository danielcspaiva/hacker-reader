import { UserSubmissionsList } from "@/components/user-submissions-list";
import { useHNAuth } from "@/contexts/hn-auth-context";

export default function SubmissionsScreen() {
  const { username } = useHNAuth();

  return <UserSubmissionsList userId={username} title="Submissions" />;
}
