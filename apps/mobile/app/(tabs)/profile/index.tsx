import {
  Button,
  ConfirmationDialog,
  Label,
  ProgressView,
  Section,
  Text,
} from "@expo/ui/swift-ui";
import { font, foregroundStyle } from "@expo/ui/swift-ui/modifiers";
import { router } from "expo-router";
import { useState } from "react";

import { SwiftForm } from "@/components/swift-form";
import { useHNAuth } from "@/contexts/hn-auth-context";
import { useHNLogin } from "@/hooks/use-hn-login";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useUser } from "@/hooks/use-user";
import { useUserSubmissions } from "@/hooks/use-user-submissions";
import { formatMemberSince, stripHTML } from "@/lib/shared";

export default function ProfileScreen() {
  const { isAuthenticated, username, logout } = useHNAuth();
  const { data: user, isLoading } = useUser(username);
  const { data: submissions } = useUserSubmissions(user?.submitted);
  const { handleLogin } = useHNLogin();
  const textColor = useThemeColor({}, "text");
  const [logoutOpen, setLogoutOpen] = useState(false);
  const submissionsCount = submissions?.length ?? 0;

  if (!isAuthenticated) {
    return (
      <SwiftForm>
        <Section title="Sign In">
          <Button
            onPress={handleLogin}
            systemImage="person.badge.key"
            label="Sign in to Hacker News"
            modifiers={[foregroundStyle(textColor)]}
          />
        </Section>
      </SwiftForm>
    );
  }

  if (isLoading) {
    return (
      <SwiftForm>
        <Section title="Loading Profile">
          <ProgressView />
        </Section>
      </SwiftForm>
    );
  }

  if (!user) {
    return (
      <SwiftForm>
        <Section title="Error">
          <Label
            title="Failed to load profile"
            systemImage="exclamationmark.triangle"
            color="red"
          />
        </Section>
      </SwiftForm>
    );
  }

  return (
    <SwiftForm>
      <Section title="Account">
        <Label title={user.id} systemImage="person" />
        <Label
          title={`${user.karma.toLocaleString()} karma`}
          systemImage="star"
        />
        <Label
          title={`Member since ${formatMemberSince(user.created)}`}
          systemImage="calendar"
        />
        {submissionsCount > 0 ? (
          <Button
            onPress={() => router.push("/(tabs)/profile/submissions")}
            systemImage="square.and.pencil"
            label={`${submissionsCount.toLocaleString()} submissions`}
            modifiers={[foregroundStyle(textColor)]}
          />
        ) : null}
      </Section>

      {user.about ? (
        <Section title="About">
          <Text modifiers={[font({ size: 15 }), foregroundStyle(textColor)]}>
            {stripHTML(user.about)}
          </Text>
        </Section>
      ) : null}

      <Section title="Sign Out">
        <ConfirmationDialog
          title="Logout"
          isPresented={logoutOpen}
          onIsPresentedChange={setLogoutOpen}
        >
          <ConfirmationDialog.Trigger>
            <Button
              onPress={() => setLogoutOpen(true)}
              role="destructive"
              systemImage="rectangle.portrait.and.arrow.right"
              label="Sign out of Hacker News"
              modifiers={[foregroundStyle("red")]}
            />
          </ConfirmationDialog.Trigger>
          <ConfirmationDialog.Message>
            <Text>Are you sure you want to logout from Hacker News?</Text>
          </ConfirmationDialog.Message>
          <ConfirmationDialog.Actions>
            <Button label="Cancel" role="cancel" />
            <Button
              label="Logout"
              role="destructive"
              onPress={() => {
                void logout();
              }}
            />
          </ConfirmationDialog.Actions>
        </ConfirmationDialog>
      </Section>
    </SwiftForm>
  );
}
