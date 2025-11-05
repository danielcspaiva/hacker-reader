/**
 * HN Guidelines Modal Component
 *
 * Displays Hacker News guidelines that users must accept before logging in.
 * This satisfies App Store Guideline 1.2 requirement for terms agreement.
 */

import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import * as WebBrowser from "expo-web-browser";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface GuidelinesModalProps {
  visible: boolean;
  onAccept: () => void;
  onReject: () => void;
}

const HN_GUIDELINES_URL = "https://news.ycombinator.com/newsguidelines.html";

export function GuidelinesModal({
  visible,
  onAccept,
  onReject,
}: GuidelinesModalProps) {
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const mutedColor = useThemeColor(
    { light: "#666666", dark: "#999999" },
    "icon"
  );
  const linkColor = useThemeColor(
    { light: "#ff6600", dark: "#ff9500" },
    "tint"
  );

  const handleViewGuidelines = async () => {
    await WebBrowser.openBrowserAsync(HN_GUIDELINES_URL);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onReject}
    >
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
        >
          <View style={styles.header}>
            <ThemedText style={styles.title}>
              Welcome to Hacker Reader
            </ThemedText>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.body}>
              Hacker Reader is a third-party client for{" "}
              <ThemedText style={[styles.bold, { color: linkColor }]}>
                Hacker News
              </ThemedText>
              , a community-driven technology news platform operated by Y
              Combinator.
            </ThemedText>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>
              Before You Sign In
            </ThemedText>
            <ThemedText style={styles.body}>
              By signing in to your Hacker News account, you agree to the Hacker
              News Guidelines.
            </ThemedText>
            <Pressable onPress={handleViewGuidelines} style={styles.linkButton}>
              <ThemedText style={[styles.linkText, { color: linkColor }]}>
                View Hacker News Guidelines →
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>
              Privacy & Safety
            </ThemedText>
            <ThemedText style={styles.bullet}>
              • Your password is never stored on this device
            </ThemedText>
            <ThemedText style={styles.bullet}>
              • All content is moderated by Hacker News
            </ThemedText>
            <ThemedText style={styles.bullet}>
              • Reports are reviewed by HN moderators within 24 hours
            </ThemedText>
            <ThemedText style={styles.bullet}>
              • You can hide or flag inappropriate content
            </ThemedText>
          </View>

          <View style={styles.section}>
            <ThemedText style={[styles.disclaimer, { color: mutedColor }]}>
              Hacker Reader is an unofficial client and is not affiliated with Y
              Combinator or Hacker News. All content, moderation, and user
              management is handled by Hacker News.
            </ThemedText>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.button, styles.buttonReject]}
            onPress={onReject}
          >
            <ThemedText style={[styles.buttonText, { color: textColor }]}>
              Cancel
            </ThemedText>
          </Pressable>

          <Pressable
            style={[
              styles.button,
              styles.buttonAccept,
              { backgroundColor: linkColor },
            ]}
            onPress={onAccept}
          >
            <ThemedText style={[styles.buttonText, styles.buttonTextAccept]}>
              Accept & Continue
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
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
    padding: 24,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  bold: {
    fontWeight: "600",
  },
  link: {
    textDecorationLine: "underline",
  },
  linkButton: {
    marginTop: 12,
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 16,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  bullet: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  disclaimer: {
    fontSize: 13,
    lineHeight: 20,
    fontStyle: "italic",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128, 128, 128, 0.2)",
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonReject: {
    backgroundColor: "rgba(128, 128, 128, 0.1)",
  },
  buttonAccept: {
    // backgroundColor set dynamically
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  buttonTextAccept: {
    color: "#ffffff",
  },
});
