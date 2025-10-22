import { ThemedText } from "@/components/themed-text";
import { useColorSchemeContext } from "@/contexts/color-scheme-context";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  Host,
  Picker
} from "@expo/ui/swift-ui";
import {
  tint as tintModifier
} from "@expo/ui/swift-ui/modifiers";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const APPEARANCE_OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

const COLOR_PALETTE_OPTIONS = [
  { value: "pale", label: "Pale" },
  { value: "lights-out", label: "Lights Out" },
] as const;

export default function SettingsScreen() {
  const { preference, setPreference, colorScheme, colorPalette, setColorPalette } = useColorSchemeContext();
  const backgroundColor = useThemeColor({}, "background");
  const tintColor = useThemeColor({}, "tint");

  const selectedIndex = APPEARANCE_OPTIONS.findIndex(
    (opt) => opt.value === preference
  );

  const selectedPaletteIndex = COLOR_PALETTE_OPTIONS.findIndex(
    (opt) => opt.value === colorPalette
  );

  const handleOptionSelected = (event: { nativeEvent: { index: number } }) => {
    const selected = APPEARANCE_OPTIONS[event.nativeEvent.index];
    if (selected) {
      setPreference(selected.value);
    }
  };

  const handlePaletteSelected = (event: { nativeEvent: { index: number } }) => {
    const selected = COLOR_PALETTE_OPTIONS[event.nativeEvent.index];
    if (selected) {
      setColorPalette(selected.value);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor }]}
      edges={["top"]}
    >
      <View style={styles.content}>
        <ThemedText style={styles.sectionTitle}>APPEARANCE</ThemedText>
        <Host matchContents colorScheme={colorScheme}>
          <Picker
            options={APPEARANCE_OPTIONS.map((opt) => opt.label)}
            selectedIndex={selectedIndex}
            onOptionSelected={handleOptionSelected}
            variant="segmented"
            modifiers={[tintModifier(tintColor)]}
          />
        </Host>

        <ThemedText style={[styles.sectionTitle, styles.sectionSpacing]}>
          COLOR PALETTE
        </ThemedText>
        <Host matchContents colorScheme={colorScheme}>
          <Picker
            options={COLOR_PALETTE_OPTIONS.map((opt) => opt.label)}
            selectedIndex={selectedPaletteIndex}
            onOptionSelected={handlePaletteSelected}
            variant="segmented"
            modifiers={[tintModifier(tintColor)]}
          />
        </Host>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 120,
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: 0.4,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "400",
    opacity: 0.6,
    marginBottom: 10,
    letterSpacing: -0.08,
  },
  sectionSpacing: {
    marginTop: 30,
  },
});
