import { Alert } from "react-native";

import { hapticImpact, Haptics } from "@/lib/haptics";

interface ConfirmDestructiveOptions {
  title: string;
  message?: string;
  /** Label of the destructive button, e.g. "Delete". */
  confirmLabel: string;
  /** Runs after the user confirms, with a medium haptic. Handle its own errors. */
  onConfirm: () => void | Promise<void>;
}

/** Cancel / destructive-action alert: the one shape every "are you sure" uses. */
export function confirmDestructive({
  title,
  message,
  confirmLabel,
  onConfirm,
}: ConfirmDestructiveOptions) {
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    {
      text: confirmLabel,
      style: "destructive",
      onPress: () => {
        hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
        void onConfirm();
      },
    },
  ]);
}
