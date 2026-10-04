import { ScrollView, StyleSheet, View } from "react-native";

import { Text, type TextVariant } from "@/components/ui";
import { Fonts, Radius } from "@/constants/theme";
import { useExternalLink } from "@/hooks/use-external-link";
import { useTheme } from "@/hooks/use-theme";
import { hapticSelection } from "@/lib/haptics";
import { getBlocks, type Span } from "@/lib/html/blocks";

interface HTMLTextProps {
  html?: string;
  variant?: Extract<TextVariant, "body" | "callout">;
}

export function HTMLText({ html, variant = "callout" }: HTMLTextProps) {
  const { colors } = useTheme();
  const openLink = useExternalLink();

  if (!html) return null;

  const blocks = getBlocks(html);
  if (blocks.length === 0) return null;

  const renderSpans = (spans: Span[], quoted: boolean) =>
    spans.map((span, index) => {
      if (span.type === "link") {
        return (
          <Text
            key={index}
            variant={variant}
            scalable
            tone="primary"
            weight="medium"
            accessibilityRole="link"
            onPress={() => {
              hapticSelection();
              void openLink(span.url);
            }}
          >
            {span.content}
          </Text>
        );
      }
      if (span.type === "code") {
        return (
          <Text
            key={index}
            variant="caption"
            scalable
            style={{
              fontFamily: Fonts.mono,
              backgroundColor: colors.codeBackground,
            }}
          >
            {` ${span.content} `}
          </Text>
        );
      }
      return (
        <Text
          key={index}
          variant={variant}
          scalable
          tone={quoted ? "muted" : "default"}
        >
          {span.content}
        </Text>
      );
    });

  return (
    <View style={styles.container}>
      {blocks.map((block, index) => {
        if (block.kind === "code") {
          return (
            <View
              key={index}
              style={[
                styles.codeBlock,
                { backgroundColor: colors.codeBackground },
              ]}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.codeContent}
              >
                <Text
                  variant="caption"
                  scalable
                  selectable
                  style={{ fontFamily: Fonts.mono }}
                >
                  {block.content}
                </Text>
              </ScrollView>
            </View>
          );
        }

        if (block.kind === "quote") {
          return (
            <View key={index} style={styles.quote}>
              <View
                style={[
                  styles.quoteBar,
                  { backgroundColor: colors.tertiaryForeground },
                ]}
              />
              <Text
                variant={variant}
                scalable
                style={styles.quoteText}
                selectable
              >
                {renderSpans(block.spans, true)}
              </Text>
            </View>
          );
        }

        return (
          <Text key={index} variant={variant} scalable selectable>
            {renderSpans(block.spans, false)}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  codeBlock: {
    borderRadius: Radius.control,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  codeContent: {
    padding: 12,
  },
  quote: {
    flexDirection: "row",
    gap: 10,
  },
  quoteBar: {
    width: 3,
    borderRadius: 2,
    borderCurve: "continuous",
  },
  quoteText: {
    flex: 1,
  },
});
