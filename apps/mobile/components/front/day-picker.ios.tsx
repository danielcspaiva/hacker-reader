import { DatePicker } from "@expo/ui/swift-ui";
import { datePickerStyle } from "@expo/ui/swift-ui/modifiers";
import { View } from "react-native";

import { ListRow } from "@/components/ui";
import { ThemedHost } from "@/components/ui/themed-host";
import { dayToPickerDate, pickerDateToDay, todayDay } from "@/lib/format/day";
import { hapticSelection } from "@/lib/haptics";

/** Row with the native compact SwiftUI date picker, limited to HN's lifetime. */
export function DayPicker({
  day,
  onChange,
}: {
  day: string;
  onChange: (day: string) => void;
}) {
  return (
    <ListRow
      title="Day (UTC)"
      trailing={
        <View>
          <ThemedHost matchContents>
            <DatePicker
              selection={dayToPickerDate(day)}
              range={{
                start: new Date(2006, 9, 9),
                end: dayToPickerDate(todayDay()),
              }}
              displayedComponents={["date"]}
              onDateChange={(date) => {
                const next = pickerDateToDay(date);
                if (next === day) return;
                hapticSelection();
                onChange(next);
              }}
              modifiers={[datePickerStyle("compact")]}
            />
          </ThemedHost>
        </View>
      }
    />
  );
}
