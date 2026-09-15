import { useColorSchemeContext } from "@/contexts/color-scheme-context";
import { hapticSelection } from "@/lib/haptics";
import { Host, Picker, Text } from "@expo/ui/swift-ui";
import { frame, glassEffect, pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
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

  const handleSelectionChange = (nextCategory: Category) => {
    if (nextCategory && nextCategory !== category) {
      hapticSelection();
      onSelectCategory(nextCategory);
    }
  };

  return (
    <View style={styles.container}>
      <Host matchContents={{ vertical: true }} colorScheme={colorScheme}>
        <Picker
          selection={category}
          onSelectionChange={handleSelectionChange}
          modifiers={[
            pickerStyle("segmented"),
            frame({ maxWidth: Number.MAX_SAFE_INTEGER }),
            glassEffect({
              glass: { variant: "regular" },
            }),
          ]}
        >
          {categories.map((cat) => (
            <Text key={cat} modifiers={[tag(cat)]}>
              {CATEGORY_LABELS[cat]}
            </Text>
          ))}
        </Picker>
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
