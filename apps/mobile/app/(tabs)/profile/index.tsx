import { router } from "expo-router";
import { View, StyleSheet } from "react-native";

import { Button, Card, IconTile, ScrollScreen, Text } from "@/components/ui";
import { UserProfileView } from "@/components/user-profile-view";
import { useHNAuth } from "@/contexts/hn-auth-context";
import { useHNLogin } from "@/hooks/use-hn-login";

export default function ProfileScreen() {
  const { isAuthenticated, username, logout } = useHNAuth();
  const { handleLogin } = useHNLogin();

  if (!isAuthenticated) {
    return (
      <ScrollScreen>
        <Card style={styles.signInCard}>
          <IconTile name="userFilled" hue="orange" size={56} />
          <View style={styles.copy}>
            <Text variant="title" style={styles.center}>
              Sign in to Hacker News
            </Text>
            <Text variant="callout" tone="muted" style={styles.center}>
              Vote, comment and keep your karma and submissions one tap away.
            </Text>
          </View>
          <Button
            label="Sign in"
            icon="login"
            size="lg"
            fullWidth
            onPress={handleLogin}
          />
        </Card>
      </ScrollScreen>
    );
  }

  return (
    <UserProfileView
      userId={username}
      onOpenSubmissions={() => router.push("/(tabs)/profile/submissions")}
      onLogout={() => void logout()}
    />
  );
}

const styles = StyleSheet.create({
  signInCard: {
    alignItems: "center",
    gap: 16,
    paddingVertical: 32,
  },
  copy: {
    gap: 6,
  },
  center: {
    textAlign: "center",
  },
});
