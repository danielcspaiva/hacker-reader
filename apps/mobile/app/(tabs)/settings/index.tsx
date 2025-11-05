import { HNLoginModal } from "@/components/auth";
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
import { useClearBookmarks } from "@/hooks/use-clear-bookmarks";
import { useClearCache } from "@/hooks/use-clear-cache";
import { useExternalLink } from "@/hooks/use-external-link";
import { useHNLogin } from "@/hooks/use-hn-login";
import { useHiddenStories } from "@/hooks/use-hidden-items";
import { useThemeColor } from "@/hooks/use-theme-color";
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
  const {
    showLoginModal,
    handleLogin,
    handleLogout,
    handleLoginSuccess,
    handleCloseModal,
  } = useHNLogin();
  const { count: hiddenCount, clearAll: clearHiddenStories } =
    useHiddenStories();
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

      <HNLoginModal
        visible={showLoginModal}
        onLoginSuccess={handleLoginSuccess}
        onCancel={handleCloseModal}
      />
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
