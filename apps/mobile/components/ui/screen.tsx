import {
  FlashList,
  type FlashListProps,
  type FlashListRef,
} from "@shopify/flash-list";
import type { ReactElement, ReactNode, Ref } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type ScrollViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GUTTER } from "@/constants/theme";
import { useReadableGutter } from "@/contexts/pane-width-context";
import { useTheme } from "@/hooks/use-theme";
import { hapticImpact } from "@/lib/haptics";

/** Themed pull-to-refresh. Pass to any ScrollView/FlashList `refreshControl`. */
export function ThemedRefreshControl(props: RefreshControlProps) {
  const { colors } = useTheme();
  return (
    <RefreshControl
      tintColor={colors.mutedForeground}
      progressBackgroundColor={colors.card}
      colors={[colors.primary]}
      {...props}
    />
  );
}

/**
 * Bottom padding for scroll content, clear of the home indicator and (on
 * Android) the tab bar. FlashList owners use it in `contentContainerStyle`.
 */
export function useScreenBottomInset() {
  const insets = useSafeAreaInsets();
  return Platform.OS === "android" ? 100 + insets.bottom : insets.bottom + 24;
}

/** Page background for screens that own their own list (FlashList). */
export function Screen({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      {children}
    </View>
  );
}

interface ScrollScreenProps extends Omit<
  ScrollViewProps,
  "refreshControl" | "contentContainerStyle"
> {
  /** Adds a themed pull-to-refresh. Feed it state for the user's own pull. */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Gap between direct children. Default 16. */
  gap?: number;
}

/** Page background + scroll view: 16 gutter (content capped at 720 and centred on wide panes), tucks under native large titles. */
export function ScrollScreen({
  onRefresh,
  refreshing = false,
  gap = GUTTER,
  children,
  ...rest
}: ScrollScreenProps) {
  const { colors } = useTheme();
  const bottom = useScreenBottomInset();
  const gutter = useReadableGutter();
  return (
    <ScrollView
      style={[styles.fill, { backgroundColor: colors.background }]}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingHorizontal: gutter,
        paddingTop: 8,
        paddingBottom: bottom,
        gap,
      }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <ThemedRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

type ListScreenOwnProps =
  | "data"
  | "refreshControl"
  | "contentContainerStyle"
  | "contentInsetAdjustmentBehavior"
  | "style"
  | "ListEmptyComponent"
  | "ListFooterComponent"
  | "onEndReached"
  | "scrollEnabled";

interface ListScreenProps<T> extends Omit<
  FlashListProps<T>,
  ListScreenOwnProps
> {
  data: readonly T[] | undefined;
  /** First load in flight: shows `skeleton` rows instead of `empty`. */
  isLoading: boolean;
  /** One placeholder row, repeated `skeletonCount` times while loading. */
  skeleton: ReactNode;
  skeletonCount?: number;
  /** Shown when loaded with no rows. */
  empty: ReactElement;
  /** Adds pull-to-refresh, guarded against a refresh already in flight. */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Called near the end of the list; leave undefined when there is no next page. */
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  listRef?: Ref<FlashListRef<T>>;
}

/**
 * Page background + FlashList: 16 gutter, tucks under native large titles, and
 * owns the loading skeletons, pull-to-refresh and the end-of-list spinner.
 */
export function ListScreen<T>({
  data,
  isLoading,
  skeleton,
  skeletonCount = 6,
  empty,
  onRefresh,
  refreshing = false,
  onLoadMore,
  isLoadingMore = false,
  listRef,
  ...rest
}: ListScreenProps<T>) {
  const { colors } = useTheme();
  const bottom = useScreenBottomInset();
  const gutter = useReadableGutter();

  return (
    <FlashList<T>
      ref={listRef}
      data={isLoading ? [] : data}
      style={{ backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingHorizontal: gutter,
        paddingTop: 8,
        paddingBottom: bottom,
      }}
      scrollEnabled={!isLoading}
      accessibilityLabel={isLoading ? "Loading" : undefined}
      refreshControl={
        onRefresh ? (
          <ThemedRefreshControl
            refreshing={refreshing && !isLoading}
            onRefresh={() => {
              if (!isLoading && !refreshing) {
                hapticImpact();
                onRefresh();
              }
            }}
          />
        ) : undefined
      }
      onEndReached={() => {
        if (onLoadMore && !isLoading && !isLoadingMore) onLoadMore();
      }}
      ListEmptyComponent={
        isLoading ? (
          <View>
            {Array.from({ length: skeletonCount }, (_, index) => (
              <View key={index}>{skeleton}</View>
            ))}
          </View>
        ) : (
          empty
        )
      }
      ListFooterComponent={
        isLoadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator size="small" color={colors.mutedForeground} />
          </View>
        ) : undefined
      }
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  footer: { paddingVertical: 20, alignItems: "center" },
});
