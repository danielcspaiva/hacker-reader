import { useThemeColor } from '@/hooks/use-theme-color';
import { StyleSheet, View } from 'react-native';
import { Skeleton } from './skeleton';

export function StoryCardSkeleton() {
  const separatorColor = useThemeColor({}, 'border');

  return (
    <View style={[styles.container, { borderBottomColor: separatorColor }]}>
      <View style={styles.content}>
        {/* Title - 3 lines */}
        <Skeleton width="100%" height={18} style={styles.titleLine} />
        <Skeleton width="95%" height={18} style={styles.titleLine} />
        {/* <Skeleton width="60%" height={20} style={styles.titleLine} /> */}

        {/* Domain */}
        <Skeleton width={120} height={12} style={styles.domain} />

        {/* Metadata row */}
        <View style={styles.metadata}>
          <Skeleton width={40} height={14} />
          <Skeleton width={60} height={14} />
          <Skeleton width={50} height={14} />
          <Skeleton width={35} height={14} />
        </View>
      </View>

      {/* Link preview thumbnail */}
      <Skeleton width={80} height={80} borderRadius={8} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 8,
    borderRadius: 50,
  },
  content: {
    flex: 1,
  },
  titleLine: {
    marginBottom: 6,
  },
  domain: {
    marginBottom: 8,
  },
  metadata: {
    flexDirection: 'row',
    gap: 12,
  },
});
