import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/hooks/use-theme";
import { hapticSelection } from "@/lib/haptics";

interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Muted right-aligned value ("Dark", "12"). */
  value?: string;
  /** Left slot, usually an `IconTile`. */
  leading?: ReactNode;
  /** Right slot after the value: Switch, Badge, spinner. */
  trailing?: ReactNode;
  destructive?: boolean;
  /** Makes the row pressable: pressed fill, selection haptic, chevron. */
  onPress?: () => void;
  /** Chevron on pressable rows. Default true. */
  chevron?: boolean;
  disabled?: boolean;
  titleLines?: number;
  accessibilityLabel?: string;
}

/** Row for `ListSection`. Min height 52; only pressable rows are buttons. */
export function ListRow({
  title,
  subtitle,
  value,
  leading,
  trailing,
  destructive = false,
  onPress,
  chevron = true,
  disabled = false,
  titleLines,
  accessibilityLabel,
}: ListRowProps) {
  const { colors } = useTheme();
  const content = (
    <View style={styles.row}>
      {leading ? <View>{leading}</View> : null}
      <View style={styles.body}>
        <Text
          variant="body"
          tone={destructive ? "destructive" : "default"}
          numberOfLines={titleLines}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text
          variant="body"
          tone="muted"
          numberOfLines={1}
          style={styles.value}
        >
          {value}
        </Text>
      ) : null}
      {trailing}
      {onPress && chevron ? (
        <Icon
          name="chevronRight"
          size={13}
          weight="semibold"
          color={colors.tertiaryForeground}
        />
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      style={({ pressed }) => [
        pressed ? { backgroundColor: colors.cardPressed } : null,
        disabled ? styles.disabled : null,
      ]}
    >
      {content}
    </Pressable>
  );
}

/** Non-row content inside a `ListSection` (a control, a paragraph, a checklist). */
export function ListSlot({
  padding = 16,
  children,
}: {
  padding?: number;
  children: ReactNode;
}) {
  return <View style={{ padding }}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  body: { flex: 1, gap: 2 },
  value: { maxWidth: "55%", textAlign: "right" },
  disabled: { opacity: 0.5 },
});
