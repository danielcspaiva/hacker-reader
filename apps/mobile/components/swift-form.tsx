import { Form, Host } from "@expo/ui/swift-ui";
import { frame } from "@expo/ui/swift-ui/modifiers";
import type { ReactNode } from "react";
import { StyleSheet } from "react-native";

import { useColorSchemeContext } from "@/contexts/color-scheme-context";

const formFill = frame({
  maxWidth: Number.MAX_SAFE_INTEGER,
  maxHeight: Number.MAX_SAFE_INTEGER,
  alignment: "top",
});

export function SwiftForm({ children }: { children: ReactNode }) {
  const { colorScheme } = useColorSchemeContext();
  return (
    <Host style={styles.host} colorScheme={colorScheme}>
      <Form modifiers={[formFill]}>{children}</Form>
    </Host>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
});
