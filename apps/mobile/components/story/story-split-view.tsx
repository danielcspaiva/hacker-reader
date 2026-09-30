import type { ReactNode } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";

import { StoryDetailLoader } from "@/components/story/story-detail-loader";
import { EmptyState } from "@/components/ui";
import { PaneWidthProvider } from "@/contexts/pane-width-context";
import { StorySelectionContext } from "@/contexts/story-selection-context";
import { useSelectedStoryId } from "@/hooks/use-selected-story-id";
import { useTheme } from "@/hooks/use-theme";
import { SIDEBAR_WIDTH, isWideLayout } from "@/lib/layout/breakpoints";

/**
 * Two-pane layout for wide windows (iPad, Split View, Stage Manager): the list
 * (`children`) in a fixed left column, the selected story's detail beside it.
 * Story cards select in place instead of pushing. On narrow windows it renders
 * `children` untouched and cards push as usual.
 */
export function StorySplitView({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const { selectedId, select } = useSelectedStoryId();

  if (!isWideLayout(width)) return <>{children}</>;

  return (
    <StorySelectionContext.Provider value={{ selectedId, select }}>
      <View style={styles.row}>
        <View
          style={[
            styles.sidebar,
            { borderRightColor: colors.border, width: SIDEBAR_WIDTH },
          ]}
        >
          <PaneWidthProvider width={SIDEBAR_WIDTH}>
            {children}
          </PaneWidthProvider>
        </View>
        <View style={styles.detail}>
          <PaneWidthProvider width={width - SIDEBAR_WIDTH}>
            {selectedId === null ? (
              <View
                style={[styles.detail, { backgroundColor: colors.background }]}
              >
                <EmptyState icon="stories" title="Select a story" />
              </View>
            ) : (
              // Keyed so collapsed threads and the draft reset per story.
              <StoryDetailLoader
                key={selectedId}
                storyId={selectedId}
                embedded
              />
            )}
          </PaneWidthProvider>
        </View>
      </View>
    </StorySelectionContext.Provider>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: "row" },
  sidebar: { borderRightWidth: StyleSheet.hairlineWidth },
  detail: { flex: 1 },
});
