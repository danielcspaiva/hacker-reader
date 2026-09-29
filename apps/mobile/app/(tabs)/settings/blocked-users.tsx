import { Alert, Button, Section, SwipeActions, Text } from "@expo/ui/swift-ui";
import { useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { SwiftForm } from "@/components/swift-form";
import { useBlockedUsers } from "@/hooks/use-blocked-users";
import { reportError } from "@/lib/observability";
import { clearBlockedUsers } from "@/lib/storage/blocked-users";

export default function BlockedUsersScreen() {
  const { blockedUsers, unblockUser, refresh } = useBlockedUsers();
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const handleUnblock = async (username: string) => {
    try {
      await unblockUser(username);
      await refresh();
    } catch (error) {
      reportError(error, { operation: "unblockUser" });
    }
  };

  const handleClearAll = async () => {
    try {
      await clearBlockedUsers();
      await refresh();
    } catch (error) {
      reportError(error, { operation: "clearBlockedUsers" });
    }
  };

  if (blockedUsers.length === 0) {
    return (
      <EmptyState
        title="No blocked users"
        description="You can block users from story cards and comments."
        systemImage="person.fill.xmark"
      />
    );
  }

  return (
    <SwiftForm>
      <Section title={`${blockedUsers.length} blocked`}>
        {blockedUsers.map((user) => (
          <SwipeActions key={user.username}>
            <Button systemImage="person.fill.xmark" label={user.username} />
            <SwipeActions.Actions edge="trailing">
              <Button
                role="destructive"
                label="Unblock"
                onPress={() => handleUnblock(user.username)}
              />
            </SwipeActions.Actions>
          </SwipeActions>
        ))}
      </Section>
      <Section>
        <Alert
          title="Unblock all users?"
          isPresented={confirmClearAll}
          onIsPresentedChange={setConfirmClearAll}
        >
          <Alert.Trigger>
            <Button
              role="destructive"
              systemImage="trash"
              label="Unblock all"
              onPress={() => setConfirmClearAll(true)}
            />
          </Alert.Trigger>
          <Alert.Message>
            <Text>
              You will see content from everyone you previously blocked.
            </Text>
          </Alert.Message>
          <Alert.Actions>
            <Button label="Cancel" role="cancel" />
            <Button
              label="Unblock all"
              role="destructive"
              onPress={handleClearAll}
            />
          </Alert.Actions>
        </Alert>
      </Section>
    </SwiftForm>
  );
}
