import { Picker, Text } from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import { View } from "react-native";

import { ListRow } from "@/components/ui";
import { ThemedHost } from "@/components/ui/themed-host";
import { hapticSelection } from "@/lib/haptics";
import { formatDigestHour } from "@/lib/pro/digest";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

/** "Delivery time" row with the native SwiftUI menu picker (whole hours). */
export function DigestHourPicker({
  hour,
  onChange,
  disabled = false,
}: {
  hour: number;
  onChange: (hour: number) => void;
  disabled?: boolean;
}) {
  return (
    <ListRow
      title="Delivery time"
      subtitle="In your time zone"
      chevron={false}
      disabled={disabled}
      trailing={
        <View pointerEvents={disabled ? "none" : "auto"}>
          <ThemedHost matchContents>
            <Picker
              selection={hour}
              onSelectionChange={(next) => {
                if (next === hour) return;
                hapticSelection();
                onChange(next);
              }}
              modifiers={[pickerStyle("menu")]}
            >
              {HOURS.map((value) => (
                <Text key={value} modifiers={[tag(value)]}>
                  {formatDigestHour(value)}
                </Text>
              ))}
            </Picker>
          </ThemedHost>
        </View>
      }
    />
  );
}
