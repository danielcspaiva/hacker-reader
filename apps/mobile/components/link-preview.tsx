import { useOGMetadata } from '@/hooks/use-og-metadata';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Image } from 'expo-image';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ThemedText } from './themed-text';

interface LinkPreviewProps {
  url: string;
  compact?: boolean;
}

export function LinkPreview({ url, compact = false }: LinkPreviewProps) {
  const { data: metadata, isLoading } = useOGMetadata(url);
  const borderColor = useThemeColor({}, 'border');
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  if (isLoading) {
    if (compact) {
      return (
        <View style={styles.thumbnailContainer}>
          <View style={[styles.thumbnailLoading, { borderColor, backgroundColor }]}>
            <ActivityIndicator size="small" color={textColor} />
          </View>
        </View>
      );
    }
    return (
      <View style={[styles.container, { borderColor, backgroundColor }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={textColor} />
        </View>
      </View>
    );
  }

  if (!metadata || !metadata.image) {
    return null;
  }

  if (compact) {
    return (
      <View style={styles.thumbnailContainer}>
        {metadata.image && (
          <Image
            source={{ uri: metadata.image }}
            style={[styles.thumbnail, { borderColor, backgroundColor }]}
            contentFit="cover"
            transition={200}
          />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { borderColor }]}>
      {metadata.image && (
        <Image
          source={{ uri: metadata.image }}
          style={[styles.image, { backgroundColor }]}
          contentFit="cover"
          transition={200}
        />
      )}
      {(metadata.title || metadata.description) && (
        <View style={styles.textContainer}>
          {metadata.title && (
            <ThemedText style={styles.title} numberOfLines={2}>
              {metadata.title}
            </ThemedText>
          )}
          {metadata.description && (
            <ThemedText style={styles.description} numberOfLines={2}>
              {metadata.description}
            </ThemedText>
          )}
          {metadata.siteName && (
            <ThemedText style={styles.siteName}>{metadata.siteName}</ThemedText>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 8,
  },
  thumbnailContainer: {
    marginLeft: 8,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 6,
    borderWidth: 1,
  },
  thumbnailLoading: {
    width: 80,
    height: 80,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    aspectRatio: 2,
  },
  loadingContainer: {
    width: '100%',
    aspectRatio: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    padding: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 20,
  },
  description: {
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 6,
    lineHeight: 18,
  },
  siteName: {
    fontSize: 12,
    opacity: 0.5,
  },
});
