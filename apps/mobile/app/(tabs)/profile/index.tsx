import { useColorSchemeContext } from "@/contexts/color-scheme-context";
import { useHNAuth } from "@/contexts/hn-auth-context";
import { useHNLogin } from "@/hooks/use-hn-login";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useUser } from "@/hooks/use-user";
import { useUserSubmissions } from "@/hooks/use-user-submissions";
import { parseHTMLText } from "@/lib/shared/utils/html";
import { formatMemberSince } from "@/lib/shared/utils/time";
import { Button, Form, Host, Section } from "@expo/ui/swift-ui";
import { foregroundStyle, frame } from "@expo/ui/swift-ui/modifiers";
import { router } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export default function ProfileScreen() {
  const { colorScheme } = useColorSchemeContext();
  const { isAuthenticated, username } = useHNAuth();
  const { data: user, isLoading } = useUser(username);
  const { data: submissions } = useUserSubmissions(user?.submitted);
  const { handleLogin, handleLogout } = useHNLogin();
  const textColor = useThemeColor({}, "text");

  // Derive count from submissions (filter out deleted and dead items)
  const submissionsCount =
    submissions?.filter((item) => !item.deleted && !item.dead).length ?? 0;

  return (
    <View style={styles.container}>
      <Host
        style={styles.host}
        useViewportSizeMeasurement
        matchContents
        colorScheme={colorScheme}
      >
        <Form
          modifiers={[
            frame({
              maxWidth: Number.MAX_SAFE_INTEGER,
              maxHeight: Number.MAX_SAFE_INTEGER,
              alignment: "top",
            }),
          ]}
        >
          {!isAuthenticated ? (
            <Section title="Sign In">
              <Button
                onPress={handleLogin}
                systemImage="person.badge.key"
                modifiers={[foregroundStyle(textColor)]}
                label="Sign in to Hacker News"
              />
            </Section>
          ) : (
            <>
              {isLoading ? (
                <Section title="Loading Profile">
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={textColor} />
                  </View>
                </Section>
              ) : user ? (
                <>
                  <Section title="Account">
                    <Button
                      systemImage="person"
                      modifiers={[foregroundStyle(textColor)]}
                      label={user.id}
                    />
                    <Button
                      systemImage="star"
                      modifiers={[foregroundStyle(textColor)]}
                      label={`${user.karma.toLocaleString()} karma`}
                    />
                    <Button
                      systemImage="calendar"
                      modifiers={[foregroundStyle(textColor)]}
                      label={`Member since ${formatMemberSince(user.created)}`}
                    />
                    {user.submitted &&
                      user.submitted.length > 0 &&
                      submissionsCount !== undefined &&
                      submissionsCount > 0 && (
                        <Button
                          onPress={() =>
                            router.push("/(tabs)/profile/submissions")
                          }
                          systemImage="square.and.pencil"
                          modifiers={[foregroundStyle(textColor)]}
                          label={`${submissionsCount.toLocaleString()} submissions`}
                        />
                      )}
                  </Section>

                  {user.about && (
                    <Section title="About">
                      <View style={styles.aboutContainer}>
                        <Text style={[styles.aboutText, { color: textColor }]}>
                          {parseHTMLText(user.about)}
                        </Text>
                      </View>
                    </Section>
                  )}

                  <Section title="Sign Out">
                    <Button
                      onPress={handleLogout}
                      role="destructive"
                      systemImage="rectangle.portrait.and.arrow.right"
                      modifiers={[foregroundStyle("red")]}
                      label="Sign out of Hacker News"
                    />
                  </Section>
                </>
              ) : (
                <Section title="Error">
                  <Button
                    systemImage="exclamationmark.triangle"
                    modifiers={[foregroundStyle("red")]}
                    label="Failed to load profile"
                  />
                </Section>
              )}
            </>
          )}
        </Form>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  host: {
    flex: 1,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  aboutContainer: {
    padding: 12,
  },
  aboutText: {
    fontSize: 15,
    lineHeight: 22,
  },
});
