import { Image, type ImageStyle } from "expo-image";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Card, Icon, INLINE_ICON_SIZE, Skeleton, Text } from "@/components/ui";
import { useOGMetadata } from "@/hooks/use-og-metadata";
import { useTheme } from "@/hooks/use-theme";

type LinkPreviewProps =
  | {
      url: string;
      compact: true;
      /** Sizes the image panel; the parent decides where it sits. */
      style: ImageStyle;
    }
  | {
      url: string;
      compact?: false;
      /** Opens the article; the whole card is the tap target. */
      onPress: () => void;
      accessibilityLabel?: string;
    };

/**
 * Open Graph preview. Compact: just the image (or its skeleton), sized by
 * `style`, for the flush panel on a story card; renders nothing when the page
 * has no image. Full: a pressable card with image, site info and the article
 * URL for story detail.
 */
export function LinkPreview(props: LinkPreviewProps) {
  const { url } = props;
  const { data: metadata, isLoading } = useOGMetadata(url);
  const { colors } = useTheme();
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const image =
    metadata?.image && metadata.image !== failedImage ? metadata.image : null;

  if (props.compact) {
    if (isLoading) {
      return <Skeleton radius={0} style={props.style} />;
    }
    if (!image) return null;
    return (
      <Image
        source={{ uri: image }}
        onError={() => setFailedImage(image)}
        style={[{ backgroundColor: colors.muted }, props.style]}
        contentFit="cover"
        transition={200}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <Card
      padding={0}
      onPress={props.onPress}
      accessibilityRole="link"
      accessibilityLabel={props.accessibilityLabel}
    >
      {isLoading ? (
        <Skeleton radius={0} style={styles.image} />
      ) : image ? (
        <Image
          source={{ uri: image }}
          onError={() => setFailedImage(image)}
          style={[styles.image, { backgroundColor: colors.muted }]}
          contentFit="cover"
          transition={200}
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <View style={styles.text}>
        {metadata?.siteName ? (
          <Text variant="label" tone="muted" numberOfLines={1}>
            {metadata.siteName}
          </Text>
        ) : null}
        {metadata?.title ? (
          <Text variant="subtitle" numberOfLines={2}>
            {metadata.title}
          </Text>
        ) : null}
        {metadata?.description ? (
          <Text variant="callout" tone="muted" numberOfLines={2}>
            {metadata.description}
          </Text>
        ) : null}
        <View style={styles.urlRow}>
          <Text
            variant="callout"
            tone="primary"
            numberOfLines={1}
            style={styles.url}
          >
            {url}
          </Text>
          <Icon
            name="external"
            size={INLINE_ICON_SIZE.caption}
            color={colors.tertiaryForeground}
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  image: {
    width: "100%",
    height: undefined,
    aspectRatio: 1.91,
  },
  text: {
    padding: 16,
    gap: 4,
  },
  urlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 4,
  },
  url: { flex: 1 },
});
