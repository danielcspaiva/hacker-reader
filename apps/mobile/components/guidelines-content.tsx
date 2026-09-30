import { StyleSheet, View } from "react-native";

import {
  Button,
  Icon,
  ListRow,
  ListSection,
  ListSlot,
  Text,
} from "@/components/ui";
import { HN_GUIDELINES_URL } from "@/constants/app-config";
import { GUTTER } from "@/constants/theme";
import { useExternalLink } from "@/hooks/use-external-link";
import { useTheme } from "@/hooks/use-theme";

const PRIVACY_POINTS = [
  "Your password is never stored on this device",
  "All content is moderated by Hacker News",
  "You can hide or flag inappropriate content",
];

export function GuidelinesContent({
  onAccept,
  onCancel,
}: {
  onAccept: () => void;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  const openLink = useExternalLink();

  return (
    <View style={styles.container}>
      {/* A plain View, not a ScrollView: RNScreens formSheets mis-lay out a
          ScrollView that has siblings (the pinned footer), leaving it blank. */}
      <View style={styles.content}>
        <ListSection
          title="Before you sign in"
          footer="By signing in, you agree to the Hacker News Guidelines."
        >
          <ListRow
            title="View Hacker News Guidelines"
            chevron
            onPress={() => openLink(HN_GUIDELINES_URL)}
          />
        </ListSection>

        <ListSection title="Privacy & safety">
          <ListSlot padding={4}>
            {PRIVACY_POINTS.map((point) => (
              <View key={point} style={styles.point}>
                <Icon name="checkmark" size={16} color={colors.success} />
                <Text variant="callout" style={styles.pointText}>
                  {point}
                </Text>
              </View>
            ))}
          </ListSlot>
        </ListSection>

        <Text variant="caption" tone="muted" style={styles.disclaimer}>
          Unofficial client. Not affiliated with Y Combinator or Hacker News.
        </Text>
      </View>

      <View style={styles.footer}>
        <Button
          label="Accept & Continue"
          size="lg"
          fullWidth
          onPress={onAccept}
        />
        <Button
          label="Cancel"
          variant="ghost"
          size="lg"
          fullWidth
          onPress={onCancel}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: GUTTER, gap: 24 },
  point: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: GUTTER,
    paddingVertical: 10,
  },
  pointText: { flex: 1 },
  disclaimer: { textAlign: "center", paddingHorizontal: 8 },
  footer: { paddingHorizontal: GUTTER, paddingBottom: 16, gap: 4 },
});
