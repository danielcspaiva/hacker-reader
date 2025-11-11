import { useColorSchemeContext } from "@/contexts/color-scheme-context";
import { Host, Picker } from "@expo/ui/swift-ui";
import { glassEffect } from "@expo/ui/swift-ui/modifiers";
import { StyleSheet, View } from "react-native";

export type SubmissionType = "stories" | "comments";

const SUBMISSION_TYPE_LABELS: Record<SubmissionType, string> = {
  stories: "Stories",
  comments: "Comments",
};

interface SubmissionTypeFilterProps {
  submissionType: SubmissionType;
  onSelectType: (type: SubmissionType) => void;
}

export function SubmissionTypeFilter({
  submissionType,
  onSelectType,
}: SubmissionTypeFilterProps) {
  const types = Object.keys(SUBMISSION_TYPE_LABELS) as SubmissionType[];
  const { colorScheme } = useColorSchemeContext();
  const selectedIndex = types.findIndex((type) => type === submissionType);

  const handleOptionSelected = (event: { nativeEvent: { index: number } }) => {
    const nextType = types[event.nativeEvent.index];
    if (nextType && nextType !== submissionType) {
      onSelectType(nextType);
    }
  };

  return (
    <View style={styles.container}>
      <Host matchContents colorScheme={colorScheme}>
        <Picker
          options={types.map((type) => SUBMISSION_TYPE_LABELS[type])}
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
