import { type ComponentRef, type Ref, useState } from "react";
import { StyleSheet, TextInput, type TextInputProps } from "react-native";

import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

/** Single-line field: card fill, 12 radius, primary border when focused. */
export function Field({
  onFocus,
  onBlur,
  style,
  ...rest
}: TextInputProps & { ref?: Ref<ComponentRef<typeof TextInput>> }) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={colors.tertiaryForeground}
      selectionColor={colors.primary}
      cursorColor={colors.primary}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={[
        styles.field,
        {
          backgroundColor: colors.card,
          color: colors.foreground,
          borderColor: focused ? colors.primary : colors.border,
        },
        style,
      ]}
      {...rest}
    />
  );
}

// fontSize only: a lineHeight makes iOS TextInput text drift.
const styles = StyleSheet.create({
  field: {
    height: 48,
    borderRadius: Radius.control,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    fontSize: 17,
  },
});
