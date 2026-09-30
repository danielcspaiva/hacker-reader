import { router } from "expo-router";
import { Pressable, StyleSheet } from "react-native";

import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { hapticSelection } from "@/lib/haptics";

/** Close button for the `sheet` header variant's `headerRight`. */
export function ModalCloseButton() {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Close"
      hitSlop={8}
      style={({ pressed }) => [styles.close, pressed ? styles.pressed : null]}
      onPress={() => {
        hapticSelection();
        router.back();
      }}
    >
      <Icon
        name="close"
        size={18}
        weight="semibold"
        color={colors.mutedForeground}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  close: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.6 },
});
