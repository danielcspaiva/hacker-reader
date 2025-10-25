import { Spacing } from "@/constants/theme";
import { useColorSchemeContext } from "@/contexts/color-scheme-context";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Host, Picker } from "@expo/ui/swift-ui";
import { GlassView } from "expo-glass-effect";
import { StyleSheet, View } from "react-native";

export type Category = "top" | "new" | "ask" | "show" | "jobs";

const CATEGORY_LABELS: Record<Category, string> = {
  top: "Top",
  new: "New",
  ask: "Ask",
  show: "Show",
  jobs: "Jobs",
};

interface CategoryFilterProps {
  category: Category;
  onSelectCategory: (category: Category) => void;
}

export function CategoryFilter({
  category,
  onSelectCategory,
}: CategoryFilterProps) {
  const categories = Object.keys(CATEGORY_LABELS) as Category[];
  const { colorScheme } = useColorSchemeContext();
  const tintColor = useThemeColor({}, "tint");
  const selectedIndex = categories.findIndex((cat) => cat === category);

  const handleOptionSelected = (event: { nativeEvent: { index: number } }) => {
    const nextCategory = categories[event.nativeEvent.index];
    if (nextCategory && nextCategory !== category) {
      requestAnimationFrame(() => {
        onSelectCategory(nextCategory);
      });
    }
  };

  return (
    <View>
      <GlassView
        style={styles.glassView}
      >
        <Host
          matchContents
          colorScheme={colorScheme}
        >
          <Picker
            options={categories.map((cat) => CATEGORY_LABELS[cat])}
            selectedIndex={selectedIndex >= 0 ? selectedIndex : 0}
            onOptionSelected={handleOptionSelected}
            variant="segmented"
          />
        </Host>
      </GlassView>
    </View>
  );
}

const styles = StyleSheet.create({
  filterContainer: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: "flex-start",
  },
  glassView: {
    borderRadius: 80,
    height: 32,
    marginHorizontal: 16,
    marginTop: 16,
    width: "auto",
    marginBottom: 16,
  },
});
