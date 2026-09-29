import { ActionSheetIOS, Alert, Platform } from "react-native";

export interface SheetAction {
  label: string;
  destructive?: boolean;
  run: () => void;
}

/** A native action sheet on iOS, a button alert elsewhere. Cancel is added for you. */
export function showActionSheet({
  title,
  actions,
}: {
  title: string;
  actions: SheetAction[];
}) {
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: [...actions.map((action) => action.label), "Cancel"],
        destructiveButtonIndex: actions.flatMap((action, index) =>
          action.destructive ? [index] : []
        ),
        cancelButtonIndex: actions.length,
      },
      (index) => actions[index]?.run()
    );
    return;
  }

  Alert.alert(title, undefined, [
    ...actions.map((action) => ({
      text: action.label,
      style: action.destructive
        ? ("destructive" as const)
        : ("default" as const),
      onPress: action.run,
    })),
    { text: "Cancel", style: "cancel" as const },
  ]);
}
