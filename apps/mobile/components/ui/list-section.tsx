import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/text";
import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

interface ListSectionProps {
  /** Eyebrow above the group (uppercase 11pt). */
  title?: string;
  /** Right-aligned control beside the eyebrow. */
  accessory?: ReactNode;
  /** Caption under the group. */
  footer?: string;
  children: ReactNode;
}

/** Inset-grouped list: radius 20 solid card, hairline separators between rows. */
export function ListSection({
  title,
  accessory,
  footer,
  children,
}: ListSectionProps) {
  const { colors } = useTheme();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={styles.section}>
      {title ? (
        <View style={styles.header}>
          <Text
            variant="label"
            tone="muted"
            numberOfLines={1}
            style={styles.title}
          >
            {title}
          </Text>
          {accessory}
        </View>
      ) : null}
      <View style={[styles.group, { backgroundColor: colors.card }]}>
        {rows.map((row, index) => (
          <Fragment key={row.key ?? index}>
            {index === 0 ? null : (
              <View
                style={[
                  styles.separator,
                  {
                    backgroundColor: colors.separator,
                    marginLeft: 16,
                  },
                ]}
              />
            )}
            {row}
          </Fragment>
        ))}
      </View>
      {footer ? (
        <Text variant="caption" tone="muted" style={styles.footer}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 16,
  },
  title: { flex: 1 },
  group: {
    borderRadius: Radius.list,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  separator: { height: StyleSheet.hairlineWidth },
  footer: { paddingHorizontal: 16 },
});
