import { StyleSheet, View } from "react-native";

import { Badge, Card, Icon, Text } from "@/components/ui";
import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { PlanSummary } from "@/lib/pro/plans";

interface PlanCardProps {
  plan: PlanSummary;
  selected: boolean;
  onPress: () => void;
}

/** One selectable plan on the paywall. Prices come from the store, never hardcoded. */
export function PlanCard({ plan, selected, onPress }: PlanCardProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.ring,
        { borderColor: selected ? colors.primary : "transparent" },
      ]}
    >
      <Card
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={`${plan.title}, ${plan.priceLabel}`}
      >
        <View style={styles.row}>
          <Icon
            name={selected ? "success" : "markUnread"}
            size={24}
            color={selected ? colors.primary : colors.tertiaryForeground}
          />
          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Text variant="subtitle">{plan.title}</Text>
              {plan.savings ? (
                <Badge label={`Save ${plan.savings}%`} tone="primary" />
              ) : null}
            </View>
            <Text variant="callout" tone="muted">
              {plan.priceLabel}
            </Text>
            {plan.perMonth ? (
              <Text variant="caption" tone="muted">
                {plan.perMonth}
              </Text>
            ) : null}
            {plan.trial ? (
              <Text variant="caption" tone="primary" weight="semibold">
                {plan.trial} free trial
              </Text>
            ) : null}
          </View>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderWidth: 2,
    borderRadius: Radius.card + 2,
    borderCurve: "continuous",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  body: { flex: 1, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
});
