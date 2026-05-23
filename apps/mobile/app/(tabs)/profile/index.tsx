import { useColorSchemeContext } from "@/contexts/color-scheme-context";
import { useHNAuth } from "@/contexts/hn-auth-context";
import { useHNLogin } from "@/hooks/use-hn-login";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useUser } from "@/hooks/use-user";
import { useUserSubmissions } from "@/hooks/use-user-submissions";
import { Button, Form, Host, Section } from "@expo/ui/swift-ui";
import { foregroundStyle, frame } from "@expo/ui/swift-ui/modifiers";
import { router } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

/**
 * Format Unix timestamp to readable date string
 */
function formatMemberSince(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/**
 * Parse HTML entities and basic tags from HN user bio
 */
function parseHTMLText(html: string): string {
  return html
    .replace(/<p>/g, "\n\n")
    .replace(/<\/p>/g, "")
    .replace(/<i>(.*?)<\/i>/g, "$1")
    .replace(/<b>(.*?)<\/b>/g, "$1")
    .replace(/<a[^>]*>(.*?)<\/a>/g, "$1")
    .replace(/&#x2F;/g, "/")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

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
      <Host style={styles.host} colorScheme={colorScheme}>
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
                label="Sign in to Hacker News"
                modifiers={[foregroundStyle(textColor)]}
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
                      label={user.id}
                      modifiers={[foregroundStyle(textColor)]}
                    />
                    <Button
                      systemImage="star"
                      label={`${user.karma.toLocaleString()} karma`}
                      modifiers={[foregroundStyle(textColor)]}
                    />
                    <Button
                      systemImage="calendar"
                      label={`Member since ${formatMemberSince(user.created)}`}
                      modifiers={[foregroundStyle(textColor)]}
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
                          label={`${submissionsCount.toLocaleString()} submissions`}
                          modifiers={[foregroundStyle(textColor)]}
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
                      label="Sign out of Hacker News"
                      modifiers={[foregroundStyle("red")]}
                    />
                  </Section>
                </>
              ) : (
                <Section title="Error">
                  <Button
                    systemImage="exclamationmark.triangle"
                    label="Failed to load profile"
                    modifiers={[foregroundStyle("red")]}
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
