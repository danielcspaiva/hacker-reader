import { useColorSchemeContext } from "@/contexts/color-scheme-context";
import { hapticSelection } from "@/lib/haptics";
import { Host, Picker, Text } from "@expo/ui/swift-ui";
import { frame, glassEffect, pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
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

  const handleSelectionChange = (nextType: SubmissionType) => {
    if (nextType && nextType !== submissionType) {
      hapticSelection();
      onSelectType(nextType);
    }
  };

  return (
    <View style={styles.container}>
      <Host matchContents={{ vertical: true }} colorScheme={colorScheme}>
        <Picker
          selection={submissionType}
          onSelectionChange={handleSelectionChange}
          modifiers={[
            pickerStyle("segmented"),
            frame({ maxWidth: Number.MAX_SAFE_INTEGER }),
            glassEffect({
              glass: { variant: "regular" },
            }),
          ]}
        >
          {types.map((type) => (
            <Text key={type} modifiers={[tag(type)]}>
              {SUBMISSION_TYPE_LABELS[type]}
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
