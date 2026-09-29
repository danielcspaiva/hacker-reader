import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";

import { useHeaderOverlapInset } from "@/components/navigation/large-title-stack";
import { Card, Skeleton } from "@/components/ui";
import { GUTTER } from "@/constants/theme";

/** Mirrors the story header and the first comments while the story loads. */
export function StoryDetailSkeleton() {
  const headerInset = useHeaderOverlapInset();
  return (
    <View style={[styles.container, { paddingTop: headerInset + 8 }]}>
      <View style={styles.hero}>
        <Skeleton width={96} height={22} radius={11} />
        <Skeleton height={28} />
        <Skeleton width="70%" height={28} />
        <Skeleton width="45%" height={16} />
      </View>
      <Skeleton height={160} radius={24} />
      <CommentSkeleton nameWidth="30%" lastLineWidth="85%" />
      <CommentSkeleton nameWidth="25%" lastLineWidth="60%" />
    </View>
  );
}

type Width = ComponentProps<typeof Skeleton>["width"];

function CommentSkeleton({
  nameWidth,
  lastLineWidth,
}: {
  nameWidth: Width;
  lastLineWidth: Width;
}) {
  return (
    <Card>
      <View style={styles.comment}>
        <Skeleton width={nameWidth} height={14} />
        <Skeleton height={14} />
        <Skeleton width={lastLineWidth} height={14} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: GUTTER,
    gap: 16,
  },
  hero: {
    gap: 10,
  },
  comment: {
    gap: 8,
  },
});
