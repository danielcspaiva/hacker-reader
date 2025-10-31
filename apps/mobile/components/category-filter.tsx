import { useColorSchemeContext } from "@/contexts/color-scheme-context";
import { Host, Picker } from "@expo/ui/swift-ui";
import { glassEffect } from "@expo/ui/swift-ui/modifiers";
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
    <View style={styles.container}>
      <Host matchContents colorScheme={colorScheme}>
        <Picker
          options={categories.map((cat) => CATEGORY_LABELS[cat])}
          selectedIndex={selectedIndex >= 0 ? selectedIndex : 0}
          onOptionSelected={handleOptionSelected}
          variant="segmented"
          modifiers={[
            glassEffect({
              glass: { variant: "regular" },
            }),
          ]}
        />
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 80,
    height: 32,
    marginHorizontal: 16,
    marginTop: 16,
    width: "auto",
    marginBottom: 24,
  },
});
