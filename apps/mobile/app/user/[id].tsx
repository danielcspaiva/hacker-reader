import { useColorSchemeContext } from "@/contexts/color-scheme-context";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useUser } from "@/hooks/use-user";
import { useUserSubmissions } from "@/hooks/use-user-submissions";
import { Button, Form, Host, Section, Text } from "@expo/ui/swift-ui";
import { foregroundStyle, frame } from "@expo/ui/swift-ui/modifiers";
import { router, useLocalSearchParams } from "expo-router";
import Stack from "expo-router/stack";
import { ActivityIndicator, StyleSheet, View } from "react-native";

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
    // Decode all numeric HTML entities (&#xHH; and &#DDD;)
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16))
    )
    .replace(/&#([0-9]+);/g, (_, dec) =>
      String.fromCharCode(Number.parseInt(dec, 10))
    )
    // Decode named HTML entities
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colorScheme } = useColorSchemeContext();
  const { data: user, isLoading } = useUser(id);
  const { data: submissions } = useUserSubmissions(user?.submitted);
  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");

  // Derive count from submissions (filter out deleted and dead items)
  const submissionsCount =
    submissions?.filter((item) => !item.deleted && !item.dead).length ?? 0;

  return (
    // <View style={[styles.container, { backgroundColor }]}>
    <>
      <Stack.Screen
        options={{
          title: user?.id || "User Profile",
          headerBackButtonDisplayMode: "minimal",
          headerTransparent: true,
          headerShown: true,
        }}
      />
      <View style={[styles.container, { backgroundColor }]}>
        <Host
          style={styles.host}
          // useViewportSizeMeasurement
          // matchContents
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
                          router.push(`/user/${user.id}/submissions`)
                        }
                        systemImage="square.and.pencil"
                        modifiers={[foregroundStyle(textColor)]}
                        label={`${submissionsCount.toLocaleString()} submissions`}
                      />
                    )}
                </Section>

                {user.about && (
                  <Section title="About">
                    <Text size={15} color={textColor}>
                      {parseHTMLText(user.about)}
                    </Text>
                  </Section>
                )}
              </>
            ) : (
              <Section title="Error">
                <Button
                  systemImage="exclamationmark.triangle"
                  modifiers={[foregroundStyle("red")]}
                  label="User not found"
                />
              </Section>
            )}
          </Form>
        </Host>
      </View>
    </>
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
});
