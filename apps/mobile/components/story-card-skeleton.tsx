import { Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { StyleSheet, View } from 'react-native';
import { Skeleton } from './skeleton';

export function StoryCardSkeleton() {
  const borderColor = useThemeColor({}, 'border');

  return (
    <GlassView
      glassEffectStyle="regular"
      isInteractive
      style={[styles.container, { borderColor }]}
    >
      <View style={styles.header}>
        <View style={styles.content}>
          {/* Top section - title and domain */}
          <View style={styles.topSection}>
            {/* Title row with bookmark indicator */}
            <View style={styles.titleRow}>
              <View style={styles.titleContainer}>
                {/* Title - 2 lines matching bodyLarge (17px) */}
                <Skeleton width="100%" height={17} style={styles.titleLine} />
                <Skeleton width="85%" height={17} />
              </View>
              {/* Bookmark indicator placeholder */}
              <Skeleton width={16} height={16} borderRadius={4} style={styles.bookmarkIndicator} />
            </View>

            {/* Domain with favicon */}
            <View style={styles.domainContainer}>
              <Skeleton width={11} height={11} borderRadius={5.5} />
              <Skeleton width={100} height={12} borderRadius={4} />
            </View>
          </View>

          {/* Metadata row */}
          <View style={styles.metadata}>
            <Skeleton width={50} height={14} borderRadius={4} />
            <Skeleton width={60} height={14} borderRadius={4} />
            <Skeleton width={45} height={14} borderRadius={4} />
          </View>
        </View>

        {/* Link preview thumbnail - matches compact mode */}
        <View style={styles.thumbnailContainer}>
          <Skeleton width={80} height={80} borderRadius={8} />
        </View>
      </View>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    borderRadius: isLiquidGlassAvailable() ? 16 : 0,
    borderWidth: isLiquidGlassAvailable() ? 0 : StyleSheet.hairlineWidth,
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: isLiquidGlassAvailable() ? Spacing.lg : 0,
    paddingVertical: Spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 70,
  },
  topSection: {
    flexShrink: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  titleContainer: {
    flex: 1,
    gap: 6,
  },
  titleLine: {
    marginBottom: 6,
  },
  bookmarkIndicator: {
    marginTop: 2,
  },
  domainContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metadata: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  thumbnailContainer: {
    marginLeft: Spacing.sm,
  },
});
