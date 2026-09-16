import { ThemedText } from "@/components/themed-text";
import { HN_GUIDELINES_URL } from "@/constants/app-config";
import { useExternalLink } from "@/hooks/use-external-link";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

export function GuidelinesContent({
  onAccept,
  onCancel,
}: {
  onAccept: () => void;
  onCancel: () => void;
}) {
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
  const openLink = useExternalLink();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionGroup}>
          <ThemedText style={styles.sectionHeader}>
            BEFORE YOU SIGN IN
          </ThemedText>
          <View style={[styles.card, { backgroundColor: cardBackgroundColor }]}>
            <ThemedText style={styles.cardBody}>
              By signing in, you agree to the Hacker News Guidelines.
            </ThemedText>
            <Pressable
              onPress={() => openLink(HN_GUIDELINES_URL)}
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
                All content is moderated by Hacker News
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

        <View style={styles.sectionGroup}>
          <ThemedText
            style={[styles.disclaimer, { color: secondaryTextColor }]}
          >
            Unofficial client. Not affiliated with Y Combinator or Hacker News.
          </ThemedText>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: linkColor },
            pressed && styles.buttonPressedPrimary,
          ]}
          onPress={onAccept}
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
          onPress={onCancel}
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
