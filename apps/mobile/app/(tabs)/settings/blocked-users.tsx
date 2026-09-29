import { Alert } from "react-native";

import {
  Button,
  EmptyState,
  ListRow,
  ListSection,
  Screen,
  ScrollScreen,
} from "@/components/ui";
import { useBlockedUsers } from "@/hooks/use-blocked-users";
import { confirmDestructive } from "@/lib/confirm-destructive";
import { Haptics, hapticNotify } from "@/lib/haptics";

export default function BlockedUsersScreen() {
  const { blockedUsers, unblockUser, clearAll } = useBlockedUsers();

  const handleUnblock = async (username: string) => {
    try {
      await unblockUser(username);
      hapticNotify(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Reported by useBlockedUsers.
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAll();
      hapticNotify(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Reported by useBlockedUsers.
    }
  };

  const confirmUnblock = (username: string) => {
    Alert.alert(`Unblock ${username}?`, "Their content will show up again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Unblock", onPress: () => void handleUnblock(username) },
    ]);
  };

  const confirmClearAll = () => {
    confirmDestructive({
      title: "Unblock all users?",
      message: "You will see content from everyone you previously blocked.",
      confirmLabel: "Unblock all",
      onConfirm: handleClearAll,
    });
  };

  if (blockedUsers.length === 0) {
    return (
      <Screen>
        <EmptyState
          icon="block"
          title="No blocked users"
          message="You can block users from story cards and comments."
        />
      </Screen>
    );
  }

  return (
    <ScrollScreen gap={24}>
      <ListSection
        title={`${blockedUsers.length} blocked`}
        footer="Blocked users' stories and comments are hidden everywhere."
      >
        {blockedUsers.map((user) => (
          <ListRow
            key={user.username}
            title={user.username}
            subtitle="Tap to unblock"
            chevron={false}
            onPress={() => confirmUnblock(user.username)}
          />
        ))}
      </ListSection>
      <Button
        label="Unblock all"
        variant="destructive"
        size="lg"
        fullWidth
        onPress={confirmClearAll}
      />
    </ScrollScreen>
  );
}
