import { Host } from "@expo/ui/swift-ui";
import type { ComponentProps } from "react";

import { useTheme } from "@/hooks/use-theme";

/**
 * `Host` renders SwiftUI using the device appearance; this injects the app's
 * resolved scheme and the brand orange as `seedColor` so menus and controls
 * pick up the same tint as the bar buttons. Use instead of `Host`.
 */
export function ThemedHost(props: ComponentProps<typeof Host>) {
  const { scheme, colors } = useTheme();
  return <Host colorScheme={scheme} seedColor={colors.primary} {...props} />;
}
