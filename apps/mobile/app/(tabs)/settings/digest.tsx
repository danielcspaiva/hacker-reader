import { Switch } from "react-native";

import { DigestHourPicker } from "@/components/pro/digest-hour-picker";
import { IconTile, ListRow, ListSection, ScrollScreen } from "@/components/ui";
import { useDailyDigest } from "@/hooks/use-daily-digest";
import { useTheme } from "@/hooks/use-theme";
import { formatDigestHour } from "@/lib/pro/digest";

/** Daily digest settings (Pro): the switch and the delivery hour. */
export default function DailyDigestSettingsScreen() {
  const { colors } = useTheme();
  const digest = useDailyDigest();

  return (
    <ScrollScreen gap={24}>
      <ListSection footer="Every morning: a push with the top stories of the last day and a one-line AI summary of each. Your time zone and preferred hour are stored on our server while this is on.">
        <ListRow
          leading={<IconTile name="digest" hue="amber" />}
          title="Daily digest"
          subtitle={
            digest.isOn
              ? `Every day around ${formatDigestHour(digest.hour)}`
              : "Off"
          }
          chevron={false}
          trailing={
            <Switch
              value={digest.isOn}
              disabled={digest.isBusy}
              onValueChange={digest.setOn}
              trackColor={{ true: colors.primary }}
              accessibilityLabel="Daily digest"
            />
          }
        />
        <DigestHourPicker
          hour={digest.hour}
          onChange={digest.setHour}
          disabled={digest.isBusy}
        />
      </ListSection>
    </ScrollScreen>
  );
}
