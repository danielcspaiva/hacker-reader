import { ThemedText } from "@/components/themed-text";
import { useColorSchemeContext } from "@/contexts/color-scheme-context";
import { ContentUnavailableView, Host } from "@expo/ui/swift-ui";
import { frame } from "@expo/ui/swift-ui/modifiers";
import { Platform, StyleSheet, View } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";

export function EmptyState({
  title,
  description,
  systemImage,
}: {
  title: string;
  description?: string;
  systemImage: SFSymbol;
}) {
  const { colorScheme } = useColorSchemeContext();

  if (Platform.OS !== "ios") {
    return (
      <View style={styles.fallback}>
        <ThemedText type="title" style={styles.fallbackTitle}>
          {title}
        </ThemedText>
        {description ? (
          <ThemedText style={styles.fallbackDescription}>
            {description}
          </ThemedText>
        ) : null}
      </View>
    );
  }

  return (
    <Host style={styles.host} colorScheme={colorScheme}>
      <ContentUnavailableView
        title={title}
        description={description}
        systemImage={systemImage}
        modifiers={[
          frame({
            maxWidth: Number.MAX_SAFE_INTEGER,
            maxHeight: Number.MAX_SAFE_INTEGER,
          }),
        ]}
      />
    </Host>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
  fallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 8,
  },
  fallbackTitle: {
    textAlign: "center",
  },
  fallbackDescription: {
    textAlign: "center",
    opacity: 0.6,
  },
});
