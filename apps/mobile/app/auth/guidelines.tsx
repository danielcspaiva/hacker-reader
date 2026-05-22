/**
 * HN Guidelines Screen
 *
 * Displays Hacker News guidelines as a standalone screen.
 * Users must accept guidelines before logging in.
 * Saves acceptance state to AsyncStorage.
 */

import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { reportError } from "@/lib/observability";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

const HN_GUIDELINES_URL = "https://news.ycombinator.com/newsguidelines.html";
const GUIDELINES_ACCEPTED_KEY = "@guidelines_accepted";

export default function GuidelinesScreen() {
  const textColor = useThemeColor({}, "text");
  const secondaryTextColor = useThemeColor(
    { light: "#8E8E93", dark: "#8E8E93" },
    "icon"
  );
  const linkColor = useThemeColor(
    { light: "#ff6600", dark: "#ff6600" },
    "tint"
  );
  const cardBackgroundColor = useThemeColor(
    { light: "#FFFFFF", dark: "#1C1C1E" },
    "previewBackground"
  );
  const separatorColor = useThemeColor(
    { light: "#C6C6C8", dark: "#38383A" },
    "border"
  );

  const handleViewGuidelines = async () => {
    await WebBrowser.openBrowserAsync(HN_GUIDELINES_URL);
  };

  const handleAccept = async () => {
    try {
      await AsyncStorage.setItem(GUIDELINES_ACCEPTED_KEY, "true");
    } catch (error) {
      reportError(error, { operation: "saveGuidelinesAcceptance" });
    }
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={[styles.scrollView]}
        contentContainerStyle={[styles.content]}
        showsVerticalScrollIndicator={false}
      >
        {/* Before You Sign In Card */}
        <View style={styles.sectionGroup}>
          <ThemedText style={styles.sectionHeader}>
            BEFORE YOU SIGN IN
          </ThemedText>
          <View style={[styles.card, { backgroundColor: cardBackgroundColor }]}>
            <ThemedText style={styles.cardBody}>
              By signing in, you agree to the Hacker News Guidelines.
            </ThemedText>
            <Pressable
              onPress={handleViewGuidelines}
              style={styles.linkContainer}
            >
              <ThemedText style={[styles.linkText, { color: linkColor }]}>
                View Hacker News Guidelines
              </ThemedText>
              <ThemedText
                style={[styles.chevron, { color: secondaryTextColor }]}
              >
                ›
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Privacy & Safety Card */}
        <View style={styles.sectionGroup}>
          <ThemedText style={styles.sectionHeader}>PRIVACY & SAFETY</ThemedText>
          <View style={[styles.card, { backgroundColor: cardBackgroundColor }]}>
            <View style={styles.listItem}>
              <ThemedText style={styles.listItemText}>
                Your password is never stored on this device
              </ThemedText>
            </View>
            <View
              style={[styles.separator, { backgroundColor: separatorColor }]}
            />
            <View style={styles.listItem}>
              <ThemedText style={styles.listItemText}>
                All content moderated by Hacker News
              </ThemedText>
            </View>
            <View
              style={[styles.separator, { backgroundColor: separatorColor }]}
            />
            <View style={styles.listItem}>
              <ThemedText style={styles.listItemText}>
                You can hide or flag inappropriate content
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Disclaimer */}
        <View style={styles.sectionGroup}>
          <ThemedText
            style={[styles.disclaimer, { color: secondaryTextColor }]}
          >
            Unofficial client. Not affiliated with Y Combinator or Hacker News.
          </ThemedText>
        </View>
      </ScrollView>

      {/* Fixed Bottom Buttons */}
      <View style={[styles.footer]}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.buttonPrimary,
            { backgroundColor: linkColor },
            pressed && styles.buttonPressedPrimary,
          ]}
          onPress={handleAccept}
        >
          <ThemedText style={styles.buttonTextPrimary}>
            Accept & Continue
          </ThemedText>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.buttonSecondary,
            { backgroundColor: cardBackgroundColor },
            pressed && styles.buttonPressed,
          ]}
          onPress={handleCancel}
        >
          <ThemedText style={[styles.buttonText, { color: textColor }]}>
            Cancel
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: 20,
  },
  sectionGroup: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "400",
    letterSpacing: -0.08,
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 20,
    opacity: 0.6,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 10,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  cardBody: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.24,
  },
  bold: {
    fontWeight: "600",
  },
  linkContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    paddingVertical: 12,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    marginBottom: -16,
  },
  linkText: {
    fontSize: 15,
    fontWeight: "400",
    letterSpacing: -0.24,
  },
  chevron: {
    fontSize: 28,
    fontWeight: "300",
    marginRight: -4,
  },
  listItem: {
    paddingVertical: 12,
  },
  listItemText: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.24,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 0,
  },
  disclaimer: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.08,
    marginHorizontal: 20,
    textAlign: "center",
  },
  footer: {
    flexDirection: "column",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  button: {
    width: "100%",
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonSecondary: {
    borderWidth: StyleSheet.hairlineWidth,
    // backgroundColor set dynamically
  },
  buttonPrimary: {
    // backgroundColor set dynamically
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonPressedPrimary: {
    opacity: 0.9,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.41,
  },
  buttonTextPrimary: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.41,
  },
});
