import { Image, type ImageStyle } from "expo-image";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { THUMBNAIL_RADIUS } from "@/components/story-card/thumbnail-panel";
import { Card, Icon, INLINE_ICON_SIZE, Skeleton, Text } from "@/components/ui";
import { GUTTER } from "@/constants/theme";
import { usePaneWidth, useReadableGutter } from "@/contexts/pane-width-context";
import { useOGMetadata } from "@/hooks/use-og-metadata";
import { useTheme } from "@/hooks/use-theme";

/** Open Graph images are typically 1.91:1. */
const OG_IMAGE_ASPECT = 1.91;
/**
 * Tallest the full preview gets. A 1.91 image at the iPad landscape pane
 * width is a poster; past this height the picture stays full width and crops.
 */
const PREVIEW_IMAGE_MAX_HEIGHT = 200;

function previewImageHeight(width: number): number {
  if (width <= 0) return PREVIEW_IMAGE_MAX_HEIGHT;
  return Math.min(width / OG_IMAGE_ASPECT, PREVIEW_IMAGE_MAX_HEIGHT);
}

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
  const paneWidth = usePaneWidth();
  const readableGutter = useReadableGutter(0);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const image =
    metadata?.image && metadata.image !== failedImage ? metadata.image : null;

  if (props.compact) {
    if (isLoading) {
      return <Skeleton radius={0} style={props.style} />;
    }
    if (!image) return null;
    // The frame is padding in the border colour, not a stroke drawn over
    // the picture: expo-image paints above a sibling border. A white image
    // otherwise runs into the card with no edge. The card stays borderless.
    return (
      <View
        style={[
          props.style,
          styles.compactFrame,
          { backgroundColor: colors.border },
        ]}
      >
        <Image
          source={{ uri: image }}
          onError={() => setFailedImage(image)}
          style={[
            styles.imageFill,
            styles.compactImage,
            { backgroundColor: colors.muted },
          ]}
          contentFit="cover"
          transition={200}
          accessibilityIgnoresInvertColors
        />
      </View>
    );
  }

  return (
    <Card
      padding={0}
      onPress={props.onPress}
      accessibilityRole="link"
      accessibilityLabel={props.accessibilityLabel}
    >
      {isLoading || image ? (
        <View
          onLayout={(event) => {
            const next = event.nativeEvent.layout.width;
            setMeasuredWidth((current) => (current === next ? current : next));
          }}
          style={[
            styles.imageFrame,
            {
              // The story header insets the card by GUTTER, and the detail
              // list adds the readable gutter. The measure replaces this
              // once the card has laid out.
              height: previewImageHeight(
                measuredWidth > 0
                  ? measuredWidth
                  : paneWidth - readableGutter * 2 - GUTTER * 2
              ),
              backgroundColor: colors.muted,
            },
          ]}
        >
          {isLoading ? (
            <Skeleton radius={0} style={styles.imageFill} />
          ) : image ? (
            <Image
              source={{ uri: image }}
              onError={() => setFailedImage(image)}
              style={styles.imageFill}
              contentFit="cover"
              transition={200}
              accessibilityIgnoresInvertColors
            />
          ) : null}
        </View>
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
  imageFrame: {
    width: "100%",
    overflow: "hidden",
  },
  compactFrame: {
    padding: 1,
  },
  compactImage: {
    borderRadius: THUMBNAIL_RADIUS - 1,
    borderCurve: "continuous",
  },
  // Fills the frame. No aspect ratio: Yoga would otherwise shrink the width
  // to honour maxHeight and leave an empty band beside the picture.
  imageFill: {
    width: "100%",
    height: "100%",
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
