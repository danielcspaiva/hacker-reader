import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import {
  Button,
  EmptyState,
  Field,
  Icon,
  ListRow,
  ListSection,
  ListSlot,
  ScrollScreen,
  Segmented,
  Text,
} from "@/components/ui";
import { useAlerts } from "@/hooks/use-alerts";
import { useTheme } from "@/hooks/use-theme";
import { Haptics, hapticNotify } from "@/lib/haptics";
import {
  ALERT_MIN_POINTS,
  DEFAULT_ALERT_MIN_POINTS,
  MAX_ALERTS,
  alertLabel,
  isSiteQuery,
  normalizeAlertQuery,
  type Alert,
  type AlertKind,
  type AlertMinPoints,
} from "@/lib/hn";

const KIND_OPTIONS = [
  { value: "keyword", label: "Word" },
  { value: "site", label: "Site" },
] as const;

const POINTS_OPTIONS = ALERT_MIN_POINTS.map((points) => ({
  value: String(points),
  label: `${points}+`,
}));

function pointsOf(value: string): AlertMinPoints {
  return (
    ALERT_MIN_POINTS.find((points) => String(points) === value) ??
    DEFAULT_ALERT_MIN_POINTS
  );
}

export default function AlertsScreen() {
  const { colors } = useTheme();
  const { alerts, isBusy, add, remove } = useAlerts();
  const [kind, setKind] = useState<AlertKind>("keyword");
  const [text, setText] = useState("");
  const [minPoints, setMinPoints] = useState<AlertMinPoints>(
    DEFAULT_ALERT_MIN_POINTS
  );

  const isFull = alerts.length >= MAX_ALERTS;
  const canAdd = !isFull && normalizeAlertQuery(kind, text) !== null;

  const handleAdd = async () => {
    if (!canAdd || isBusy) return;
    if (await add({ kind, text, minPoints })) {
      setText("");
      hapticNotify(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleRemove = async (alert: Alert) => {
    await remove(alert.id);
    hapticNotify(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <ScrollScreen gap={24}>
      <ListSection
        title="Add an alert"
        footer={`Pushes a story once when its title has the word or phrase (or it links to the site) and it reaches the points. Checked every 10 minutes, up to ${MAX_ALERTS} alerts, stories from the last 2 days.`}
      >
        <ListSlot>
          <View style={styles.form}>
            <Segmented options={KIND_OPTIONS} value={kind} onChange={setKind} />
            <Field
              placeholder={
                kind === "keyword" ? "SQLite, “rust async”" : "example.com"
              }
              value={text}
              onChangeText={setText}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType={kind === "site" ? "url" : "default"}
              returnKeyType="done"
              maxLength={kind === "site" ? 80 : 60}
              onSubmitEditing={() => void handleAdd()}
            />
            <View style={styles.points}>
              <Text variant="caption" tone="muted">
                Minimum points
              </Text>
              <Segmented
                options={POINTS_OPTIONS}
                value={String(minPoints)}
                onChange={(value) => setMinPoints(pointsOf(value))}
              />
            </View>
            <Button
              label={isFull ? "Alert limit reached" : "Add alert"}
              icon="keywordAlert"
              fullWidth
              disabled={!canAdd || isBusy}
              onPress={() => void handleAdd()}
            />
          </View>
        </ListSlot>
      </ListSection>
      {alerts.length > 0 ? (
        <ListSection title="Your alerts">
          {alerts.map((alert) => (
            <ListRow
              key={alert.id}
              title={alertLabel(alert.query)}
              subtitle={`${isSiteQuery(alert.query) ? "Site · " : ""}${alert.minPoints}+ points`}
              titleLines={1}
              trailing={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove alert ${alertLabel(alert.query)}`}
                  hitSlop={10}
                  disabled={isBusy}
                  onPress={() => void handleRemove(alert)}
                >
                  <Icon name="trash" size={18} color={colors.danger} />
                </Pressable>
              }
            />
          ))}
        </ListSection>
      ) : (
        <EmptyState
          icon="keywordAlert"
          title="No alerts yet"
          message="Get a push when a story about SQLite gets 100+ points."
        />
      )}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  points: { gap: 6 },
});
