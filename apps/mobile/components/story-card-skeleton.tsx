import { StyleSheet, View } from "react-native";

import { thumbnailPanel } from "@/components/story-card/story-card";
import { Card, Skeleton } from "@/components/ui";
import { CARD_GAP } from "@/constants/theme";

/** Mirrors StoryCard: text column (eyebrow, title, stats) beside a flush image panel. */
export function StoryCardSkeleton() {
  return (
    <Card padding={0} style={styles.card}>
      <View style={styles.row}>
        <View style={styles.body}>
          <View style={styles.eyebrow}>
            <Skeleton width={16} height={16} radius={5} />
            <Skeleton width={110} height={12} radius={4} />
          </View>
          <View style={styles.lines}>
            <Skeleton height={17} radius={5} />
            <Skeleton height={17} radius={5} />
            <Skeleton width="60%" height={17} radius={5} />
          </View>
          <View style={styles.footer}>
            <Skeleton width={90} height={12} radius={4} />
            <Skeleton width={70} height={12} radius={4} />
          </View>
        </View>
        <Skeleton height={0} style={thumbnailPanel} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: CARD_GAP,
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 96,
  },
  body: {
    flex: 1,
    padding: 14,
    gap: 8,
    justifyContent: "space-between",
  },
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 18,
  },
  lines: {
    gap: 7,
    paddingTop: 2,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
