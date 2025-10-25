import { useColorSchemeContext } from "@/contexts/color-scheme-context";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Spacing } from "@/constants/theme";
import { Button, Host, HStack, Text } from "@expo/ui/swift-ui";
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

  return (
    <View style={[styles.filterContainer]}>
      <Host
        style={styles.hostContainer}
        matchContents
        colorScheme={colorScheme}
      >
        <HStack spacing={10}>
          {categories.map((cat) => {
            const isSelected = cat === category;
            return (
              <Button
                key={cat}
                variant={"glassProminent"}
                onPress={() => {
                  // Defer state update to allow press animation to complete
                  requestAnimationFrame(() => {
                    onSelectCategory(cat);
                  });
                }}
                controlSize="regular"
                color={isSelected ? tintColor : "transparent"}
                // role="default"
              >
                <Text
                  color={
                    isSelected
                      ? colorScheme === "light"
                        ? "white"
                        : "black"
                      : tintColor
                  }
                  weight="medium"
                >
                  {CATEGORY_LABELS[cat]}
                </Text>
              </Button>
            );
          })}
        </HStack>
      </Host>
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
  hostContainer: {
    flex: 1,
    height: 40,
    width: "100%",
  },
});
