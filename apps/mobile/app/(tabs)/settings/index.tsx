import {
  ANDROID_PLAY_STORE_URL,
  APP_NAME,
  APP_VERSION,
  IOS_APP_STORE_URL,
  REPO_URL,
} from "@/constants/app-config";
import { useColorSchemeContext } from "@/contexts/color-scheme-context";
import { useHNAuth } from "@/contexts/hn-auth-context";
import { useAppearanceSettings } from "@/hooks/use-appearance-settings";
import { useBlockedUsers } from "@/hooks/use-blocked-users";
import { useClearBookmarks } from "@/hooks/use-clear-bookmarks";
import { useClearCache } from "@/hooks/use-clear-cache";
import { useExternalLink } from "@/hooks/use-external-link";
import { useHiddenStories } from "@/hooks/use-hidden-items";
import { useHNLogin } from "@/hooks/use-hn-login";
import { useThemeColor } from "@/hooks/use-theme-color";
import { clearBlockedUsers } from "@/lib/storage/blocked-users";
import { Button, Form, Host, Picker, Section } from "@expo/ui/swift-ui";
import { foregroundStyle, frame } from "@expo/ui/swift-ui/modifiers";
import { Alert, Platform, StyleSheet, View } from "react-native";

const HN_GUIDELINES_URL = "https://news.ycombinator.com/newsguidelines.html";

export default function SettingsScreen() {
  const { colorScheme } = useColorSchemeContext();
  const { isAuthenticated } = useHNAuth();
  const textColor = useThemeColor({}, "text");

  // Custom hooks for all business logic
  const { options, selectedIndex, handleOptionSelected } =
    useAppearanceSettings();
  const { handleClearCache } = useClearCache();
  const { handleClearBookmarks, clearBookmarksLabel, isClearing } =
    useClearBookmarks();
  const { handleLogin, handleLogout } = useHNLogin();
  const { count: hiddenCount, clearAll: clearHiddenStories } =
    useHiddenStories();
  const {
    blockedUsers,
    unblockUser,
    refresh: refreshBlockedUsers,
  } = useBlockedUsers();
  const openLink = useExternalLink();

  const handleOpenRepository = () => openLink(REPO_URL);
  const handleRateApp = () => {
    const rateUrl = Platform.select({
      ios: IOS_APP_STORE_URL,
      android: ANDROID_PLAY_STORE_URL,
      default: IOS_APP_STORE_URL,
    });
    if (rateUrl) openLink(rateUrl);
  };
  const handleOpenWebsite = () => openLink("https://dcsp.dev");
  const handleOpenGuidelines = () => openLink(HN_GUIDELINES_URL);
  const handleClearHidden = () => {
    if (hiddenCount === 0) {
      Alert.alert("No Hidden Posts", "You haven't hidden any posts yet.");
      return;
    }

    Alert.alert(
      "Clear Hidden Posts",
      `Unhide all ${hiddenCount} hidden posts?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: clearHiddenStories,
        },
      ]
    );
  };

  const handleManageBlockedUsers = () => {
    if (blockedUsers.length === 0) {
      Alert.alert(
        "No Blocked Users",
        "You haven't blocked any users yet. You can block users from story cards and comments."
      );
      return;
    }

    // Build the alert message showing all blocked users
    const userList = blockedUsers.map((u) => u.username).join("\n");
    const message = `Blocked users (${blockedUsers.length}):\n\n${userList}\n\nSelect a user to unblock:`;

    // Create unblock actions for each user
    const actions = blockedUsers.map((user) => ({
      text: user.username,
      onPress: async () => {
        Alert.alert(
          "Unblock User",
          `Unblock ${user.username}? You will start seeing their content again.`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Unblock",
              onPress: async () => {
                try {
                  await unblockUser(user.username);
                  await refreshBlockedUsers();
                  Alert.alert(
                    "User Unblocked",
                    `You will now see content from ${user.username}.`
                  );
                } catch {
                  Alert.alert(
                    "Error",
                    "Failed to unblock user. Please try again."
                  );
                }
              },
            },
          ]
        );
      },
    }));

    // Add clear all and cancel options
    actions.push({
      text: "Clear All",
      onPress: async () => {
        Alert.alert(
          "Clear All Blocked Users",
          `Unblock all ${blockedUsers.length} users?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Clear All",
              style: "destructive",
              onPress: async () => {
                try {
                  await clearBlockedUsers();
                  await refreshBlockedUsers();
                  Alert.alert(
                    "All Users Unblocked",
                    "You will now see content from all previously blocked users."
                  );
                } catch {
                  Alert.alert(
                    "Error",
                    "Failed to clear blocked users. Please try again."
                  );
                }
              },
            },
          ]
        );
      },
    });

    actions.push({
      text: "Cancel",
      onPress: async () => {},
    });

    Alert.alert("Blocked Users", message, actions);
  };

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
          <Section title="Account">
            {isAuthenticated ? (
              <Button
                onPress={handleLogout}
                role="destructive"
                systemImage="rectangle.portrait.and.arrow.right"
                modifiers={[foregroundStyle("red")]}
              >
                Sign out of Hacker News
              </Button>
            ) : (
              <Button
                onPress={handleLogin}
                systemImage="person.badge.key"
                modifiers={[foregroundStyle(textColor)]}
              >
                Sign in to Hacker News
              </Button>
            )}
          </Section>

          <Section title="Appearance">
            <Picker
              options={options}
              selectedIndex={selectedIndex}
              onOptionSelected={handleOptionSelected}
              variant="segmented"
            />
          </Section>

          <Section title="Content & Safety">
            <Button
              onPress={handleOpenGuidelines}
              systemImage="doc.text"
              modifiers={[foregroundStyle(textColor)]}
            >
              Hacker News Guidelines
            </Button>
            <Button
              onPress={handleManageBlockedUsers}
              systemImage="person.fill.xmark"
              modifiers={[foregroundStyle(textColor)]}
            >
              {blockedUsers.length > 0
                ? `Blocked Users (${blockedUsers.length})`
                : "Blocked Users"}
            </Button>
            <Button
              onPress={handleClearHidden}
              systemImage="eye.slash"
              modifiers={[foregroundStyle(textColor)]}
            >
              {hiddenCount > 0
                ? `Hidden Posts (${hiddenCount})`
                : "Hidden Posts"}
            </Button>
          </Section>

          <Section title="Data">
            <Button
              onPress={handleClearCache}
              systemImage="arrow.clockwise"
              modifiers={[foregroundStyle(textColor)]}
            >
              Clear Cache
            </Button>
            <Button
              onPress={handleClearBookmarks}
              role="destructive"
              systemImage="trash"
              disabled={isClearing}
              modifiers={[foregroundStyle("red")]}
            >
              {clearBookmarksLabel}
            </Button>
          </Section>

          <Section title="Support">
            <Button
              onPress={handleOpenRepository}
              systemImage="chevron.left.slash.chevron.right"
              modifiers={[foregroundStyle(textColor)]}
            >
              Check Source Code
            </Button>
            <Button
              onPress={handleRateApp}
              systemImage="star"
              modifiers={[foregroundStyle(textColor)]}
            >
              Rate Hacker Reader
            </Button>
          </Section>

          <Section title="About">
            <Button
              onPress={handleOpenWebsite}
              systemImage="globe"
              modifiers={[foregroundStyle(textColor)]}
            >
              Built by dcsp.dev
            </Button>
            <Button
              systemImage="info.circle"
              modifiers={[foregroundStyle(textColor)]}
            >
              {`${APP_NAME} v${APP_VERSION}`}
            </Button>
          </Section>
        </Form>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});
