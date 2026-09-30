import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon-names";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/hooks/use-theme";

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  message?: string;
  /** Usually a `Button`. */
  action?: ReactNode;
  /** Centre in the available space (default). False keeps content height, for inside a section. */
  fill?: boolean;
}

/** iOS ContentUnavailableView: glyph, title, message, optional action. */
export function EmptyState({
  icon,
  title,
  message,
  action,
  fill = true,
}: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, fill ? styles.fill : styles.compact]}>
      {icon ? (
        <Icon
          name={icon}
          size={40}
          weight="light"
          color={colors.tertiaryForeground}
        />
      ) : null}
      <View style={styles.text}>
        <Text variant="subtitle" style={styles.center}>
          {title}
        </Text>
        {message ? (
          <Text variant="callout" tone="muted" style={styles.center}>
            {message}
          </Text>
        ) : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 32,
  },
  fill: { flex: 1, justifyContent: "center", paddingVertical: 48 },
  compact: { paddingVertical: 40 },
  text: { alignItems: "center", gap: 4 },
  action: { alignItems: "center" },
  center: { textAlign: "center" },
});
