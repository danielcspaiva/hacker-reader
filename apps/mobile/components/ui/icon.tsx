import { SymbolView, type SymbolWeight } from "expo-symbols";
import type { ViewProps } from "react-native";

import { ICON_GLYPHS, type IconName } from "@/components/ui/icon-names";
import { useTheme } from "@/hooks/use-theme";

/**
 * Inline icons sit next to text: size them to the text style and match the
 * text's weight, so a glyph never reads lighter or heavier than its label.
 */
export const INLINE_ICON_SIZE = {
  caption: 12,
  callout: 14,
  body: 16,
} as const;

interface IconProps {
  /** Semantic name from the registry. */
  name: IconName;
  size?: number;
  /** Defaults to `foreground`. */
  color?: string;
  /** Defaults to `medium`; pass the adjacent text's weight for inline icons. */
  weight?: SymbolWeight;
  style?: ViewProps["style"];
  /** Decorative (hidden from VoiceOver) unless given. */
  accessibilityLabel?: string;
}

export function Icon({
  name,
  size = 20,
  color,
  weight = "medium",
  style,
  accessibilityLabel,
}: IconProps) {
  const { colors } = useTheme();
  const labelled = accessibilityLabel !== undefined;
  return (
    <SymbolView
      name={ICON_GLYPHS[name]}
      size={size}
      tintColor={color ?? colors.foreground}
      weight={weight}
      style={style}
      accessible={labelled}
      accessibilityElementsHidden={!labelled}
      importantForAccessibility={labelled ? "auto" : "no-hide-descendants"}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={labelled ? "image" : undefined}
    />
  );
}
