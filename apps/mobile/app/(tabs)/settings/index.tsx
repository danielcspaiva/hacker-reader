import { HNLoginModal } from "@/components/auth";
import { EVENTS } from "@/constants/analytics-events";
import { useColorSchemeContext } from "@/contexts/color-scheme-context";
import { useHNAuth } from "@/contexts/hn-auth-context";
import { useAnalytics } from "@/hooks/use-analytics";
import { useAppearanceSettings } from "@/hooks/use-appearance-settings";
import { useClearBookmarks } from "@/hooks/use-clear-bookmarks";
import { useClearCache } from "@/hooks/use-clear-cache";
import { useExternalLink } from "@/hooks/use-external-link";
import { useHNLogin } from "@/hooks/use-hn-login";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Button, Form, Host, Picker, Section, Text } from "@expo/ui/swift-ui";
import { foregroundStyle, frame } from "@expo/ui/swift-ui/modifiers";
import { Platform, StyleSheet, View } from "react-native";

const APP_NAME = "Hacker Reader";
const APP_VERSION = "1.0.0";
const REPO_URL = "https://github.com/danielcspaiva/hacker-reader";
const IOS_APP_STORE_URL = "https://github.com/danielcspaiva/hacker-reader";
const ANDROID_PLAY_STORE_URL = "https://github.com/danielcspaiva/hacker-reader";

export default function SettingsScreen() {
  const { colorScheme } = useColorSchemeContext();
  const { isAuthenticated } = useHNAuth();
  const textColor = useThemeColor({}, "text");
  const analytics = useAnalytics();

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
  const openLink = useExternalLink();

  const handleOpenRepository = () => {
    analytics.track(EVENTS.SOURCE_CODE_VIEWED);
    openLink(REPO_URL);
  };

  const handleRateApp = () => {
    analytics.track(EVENTS.APP_RATED);
    const rateUrl = Platform.select({
      ios: IOS_APP_STORE_URL,
      android: ANDROID_PLAY_STORE_URL,
      default: IOS_APP_STORE_URL,
    });
    if (rateUrl) openLink(rateUrl);
  };

  const handleLoginWithTracking = () => {
    analytics.track(EVENTS.LOGIN_INITIATED);
    handleLogin();
  };

  const handleClearCacheWithTracking = () => {
    analytics.track(EVENTS.CACHE_CLEARED);
    handleClearCache();
  };

  const handleClearBookmarksWithTracking = () => {
    analytics.track(EVENTS.BOOKMARKS_CLEARED);
    handleClearBookmarks();
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
                onPress={handleLoginWithTracking}
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

          <Section title="Data">
            <Button
              onPress={handleClearCacheWithTracking}
              systemImage="arrow.clockwise"
              modifiers={[foregroundStyle(textColor)]}
            >
              Clear Cache
            </Button>
            <Button
              onPress={handleClearBookmarksWithTracking}
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
            <Text size={12}>Built by dcsp.dev</Text>
            <Text>{`${APP_NAME} v${APP_VERSION}`}</Text>
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
