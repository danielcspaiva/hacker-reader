import { Picker, Text } from "@expo/ui/swift-ui";
import {
  controlSize,
  padding,
  pickerStyle,
  tag,
} from "@expo/ui/swift-ui/modifiers";
import { View } from "react-native";

import type { SegmentedProps } from "@/components/ui/segmented";
import { ThemedHost } from "@/components/ui/themed-host";
import { hapticSelection } from "@/lib/haptics";

export type {
  SegmentedOption,
  SegmentedProps,
} from "@/components/ui/segmented";

/**
 * Native SwiftUI segmented Picker, large control size, no glass modifier. The
 * colour scheme comes from `ThemedHost`.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedProps<T>) {
  return (
    <View style={style}>
      <ThemedHost matchContents={{ vertical: true }}>
        <Picker
          selection={value}
          onSelectionChange={(next) => {
            if (next === value) return;
            hapticSelection();
            onChange(next);
          }}
          modifiers={[
            pickerStyle("segmented"),
            controlSize("large"),
            padding({ vertical: 3, horizontal: 3 }),
          ]}
        >
          {options.map((option) => (
            <Text key={option.value} modifiers={[tag(option.value)]}>
              {option.label}
            </Text>
          ))}
        </Picker>
      </ThemedHost>
    </View>
  );
}
