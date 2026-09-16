import { SwiftForm } from "@/components/swift-form";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useUser } from "@/hooks/use-user";
import { useUserSubmissions } from "@/hooks/use-user-submissions";
import { formatMemberSince, stripHTML } from "@/lib/shared";
import {
  Button,
  Label,
  ProgressView,
  Section,
  Text,
} from "@expo/ui/swift-ui";
import { font, foregroundStyle } from "@expo/ui/swift-ui/modifiers";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: user, isLoading } = useUser(id);
  const { data: submissions } = useUserSubmissions(user?.submitted);
  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const submissionsCount = submissions?.length ?? 0;

  return (
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
        <SwiftForm>
          {isLoading ? (
            <Section title="Loading Profile">
              <ProgressView />
            </Section>
          ) : user ? (
            <>
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
                    onPress={() => router.push(`/user/${user.id}/submissions`)}
                    systemImage="square.and.pencil"
                    label={`${submissionsCount.toLocaleString()} submissions`}
                    modifiers={[foregroundStyle(textColor)]}
                  />
                ) : null}
              </Section>

              {user.about ? (
                <Section title="About">
                  <Text
                    modifiers={[
                      font({ size: 15 }),
                      foregroundStyle(textColor),
                    ]}
                  >
                    {stripHTML(user.about)}
                  </Text>
                </Section>
              ) : null}
            </>
          ) : (
            <Section title="Error">
              <Label
                title="User not found"
                systemImage="exclamationmark.triangle"
                color="red"
              />
            </Section>
          )}
        </SwiftForm>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
