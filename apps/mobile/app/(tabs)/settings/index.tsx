import { HNLoginModal } from "@/components/auth";
import { useColorSchemeContext } from "@/contexts/color-scheme-context";
import { useHNAuth } from "@/contexts/hn-auth-context";
import { useBookmarkIds } from "@/hooks/use-bookmarks";
import { useThemeColor } from "@/hooks/use-theme-color";
import { clearBookmarks } from "@/lib/bookmarks";
import { Button, Form, Host, Picker, Section, Text } from "@expo/ui/swift-ui";
import { useQueryClient } from "@tanstack/react-query";
// import Constants from "expo-constants";
import { foregroundStyle, frame } from "@expo/ui/swift-ui/modifiers";
import * as WebBrowser from "expo-web-browser";
import { useMemo, useState } from "react";
import { Alert, Platform, StyleSheet, View } from "react-native";

const APPEARANCE_OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

// const { expoConfig, manifest, nativeAppVersion } = Constants;

const APP_NAME = "Hacker Reader";

const APP_VERSION = "1.0.0";

const REPO_URL = "https://github.com/danielcspaiva/hn-client";
const IOS_APP_STORE_URL = "https://apps.apple.com/us/search?term=Hacker%20Lens";
const ANDROID_PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.danielcspaiva.hnclient";

export default function SettingsScreen() {
  const { preference, setPreference, colorScheme } = useColorSchemeContext();
  const { session, login, logout, isAuthenticated } = useHNAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const textColor = useThemeColor({}, "text");
  const queryClient = useQueryClient();
  const { data: bookmarkIds = [] } = useBookmarkIds();
  const [isClearingBookmarks, setIsClearingBookmarks] = useState(false);
  const bookmarkCount = bookmarkIds.length;
  const clearBookmarksLabel = useMemo(() => {
    if (bookmarkCount === 0) return "Clear Bookmarks";
    const noun = bookmarkCount === 1 ? "Bookmark" : "Bookmarks";
    return `Clear ${bookmarkCount} ${noun}`;
  }, [bookmarkCount]);

  const selectedIndex = APPEARANCE_OPTIONS.findIndex(
    (opt) => opt.value === preference
  );

  const handleOptionSelected = (event: { nativeEvent: { index: number } }) => {
    const selected = APPEARANCE_OPTIONS[event.nativeEvent.index];
    if (selected) {
      setPreference(selected.value);
    }
  };

  const handleOpenRepository = async () => {
    try {
      await WebBrowser.openBrowserAsync(REPO_URL);
    } catch (error) {
      console.error("Error opening repository:", error);
      Alert.alert("Unable to open link", "Please try again later.");
    }
  };

  const handleRateApp = async () => {
    const rateUrl =
      Platform.select({
        ios: IOS_APP_STORE_URL,
        android: ANDROID_PLAY_STORE_URL,
        default: IOS_APP_STORE_URL,
      }) ?? IOS_APP_STORE_URL;

    if (!rateUrl) {
      Alert.alert(
        "Unavailable",
        "Rating is not supported on this platform yet."
      );
      return;
    }

    try {
      await WebBrowser.openBrowserAsync(rateUrl);
    } catch (error) {
      console.error("Error opening store listing:", error);
      Alert.alert("Unable to open store", "Please try again later.");
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      "Clear Cache",
      "This will clear all cached stories and comments. You'll need to reload them from Hacker News.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            queryClient.clear();
            Alert.alert("Success", "Cache cleared successfully");
          },
        },
      ]
    );
  };

  const handleClearBookmarks = () => {
    if (bookmarkCount === 0) {
      Alert.alert("No Bookmarks", "You don't have any bookmarks to clear.");
      return;
    }

    Alert.alert(
      "Clear All Bookmarks",
      `Are you sure you want to remove all ${bookmarkCount} bookmarks? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              setIsClearingBookmarks(true);
              await clearBookmarks();
              queryClient.setQueryData<number[]>(["bookmarks"], []);
              queryClient.setQueryData(["bookmarks", "stories"], []);
              queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
              queryClient.invalidateQueries({ queryKey: ["bookmark"] });
              Alert.alert("Success", "All bookmarks cleared");
            } catch (error) {
              console.error("Error clearing bookmarks:", error);
              Alert.alert(
                "Error",
                "Something went wrong while clearing bookmarks."
              );
            } finally {
              setIsClearingBookmarks(false);
            }
          },
        },
      ]
    );
  };

  const handleLogin = () => {
    setShowLoginModal(true);
  };

  const handleLoginSuccess = async (cookies: Record<string, string>) => {
    await login(cookies);
    setShowLoginModal(false);
    Alert.alert("Success", "Logged in to Hacker News successfully!");
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout from Hacker News?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          Alert.alert("Success", "Logged out successfully");
        },
      },
    ]);
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
                Logout from Hacker News
              </Button>
            ) : (
              <Button
                onPress={handleLogin}
                systemImage="person.badge.key"
                modifiers={[foregroundStyle(textColor)]}
              >
                Login to Hacker News
              </Button>
            )}
          </Section>

          <Section title="Appearance">
            <Picker
              options={APPEARANCE_OPTIONS.map((opt) => opt.label)}
              selectedIndex={selectedIndex}
              onOptionSelected={handleOptionSelected}
              variant="segmented"
            />
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
              disabled={isClearingBookmarks}
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
            <Text size={12}>Built by dcsp.dev</Text>
            <Text
              size={12}
              // modifiers={[
              //   frameModifier({
              //     maxWidth: Number.MAX_SAFE_INTEGER,
              //     alignment: "center",
              //   }),
              //   foregroundStyle({ type: "hierarchical", style: "tertiary" }),
              // ]}
            >
              {`${APP_NAME} v${APP_VERSION}`}
            </Text>
          </Section>
        </Form>
      </Host>

      <HNLoginModal
        visible={showLoginModal}
        onLoginSuccess={handleLoginSuccess}
        onCancel={() => setShowLoginModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    borderWidth: 1,
    borderColor: "blue",
  },
  container: {
    flex: 1,
    // borderWidth: 1,
    // borderColor: 'red',
  },
});
