import { Alert } from "react-native";

import { useBlockedUsers } from "@/hooks/use-blocked-users";
import { confirmDestructive } from "@/lib/confirm-destructive";

/**
 * Returns a function that confirms, then blocks an author, then tells the user.
 * Shared by story and comment authors so both behave the same. The storage
 * failure is reported by `useBlockedUsers`; here it is only surfaced.
 */
export function useBlockUserWithFeedback() {
  const { blockUser } = useBlockedUsers();

  return (username: string | undefined) => {
    if (!username) {
      Alert.alert("Error", "Cannot block this user.", [{ text: "OK" }]);
      return;
    }

    confirmDestructive({
      title: "Block User",
      message: `Block all content from ${username}? This will hide their stories and comments from your feed.`,
      confirmLabel: "Block",
      onConfirm: async () => {
        try {
          await blockUser(username);
          Alert.alert(
            "User Blocked",
            `You will no longer see content from ${username}. You can unblock them in Settings.`,
            [{ text: "OK" }]
          );
        } catch {
          Alert.alert("Error", "Failed to block user. Please try again.", [
            { text: "OK" },
          ]);
        }
      },
    });
  };
}
