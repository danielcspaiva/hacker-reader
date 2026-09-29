import { Host, ProgressView } from "@expo/ui/swift-ui";
import { progressViewStyle } from "@expo/ui/swift-ui/modifiers";
import { ActivityIndicator, Platform, StyleSheet } from "react-native";

import { useColorSchemeContext } from "@/contexts/color-scheme-context";
import { useThemeColor } from "@/hooks/use-theme-color";

export function NativeProgress({
  size = "large",
}: {
  size?: "small" | "large";
}) {
  const { colorScheme } = useColorSchemeContext();
  const color = useThemeColor({}, "text");

  if (Platform.OS !== "ios") {
    return <ActivityIndicator size={size} color={color} />;
  }

  // Host crashes Fabric inside presented formSheets; keep this off those screens.
  return (
    <Host
      matchContents
      colorScheme={colorScheme}
      style={size === "large" ? styles.large : styles.small}
    >
      <ProgressView modifiers={[progressViewStyle("circular")]} />
    </Host>
  );
}

const styles = StyleSheet.create({
  large: {
    width: 36,
    height: 36,
  },
  small: {
    width: 20,
    height: 20,
  },
});
