import { Pressable, StyleSheet, View, type ViewProps } from "react-native";

import { Text } from "@/components/ui/text";
import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { hapticSelection } from "@/lib/haptics";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: ViewProps["style"];
}

/** Non-iOS fallback. iOS renders a native SwiftUI segmented Picker (segmented.ios.tsx). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedProps<T>) {
  const { colors } = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: colors.muted }, style]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              hapticSelection();
              onChange(option.value);
            }}
            style={[
              styles.segment,
              selected ? { backgroundColor: colors.card } : null,
            ]}
          >
            <Text variant="callout" weight={selected ? "semibold" : "medium"}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    padding: 2,
    borderRadius: Radius.control,
    borderCurve: "continuous",
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 34,
    borderRadius: Radius.control - 2,
    borderCurve: "continuous",
  },
});
