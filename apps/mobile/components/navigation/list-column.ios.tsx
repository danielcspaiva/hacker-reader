import type { ReactNode } from "react";
import { StyleSheet } from "react-native";
import {
  ScreenStack,
  ScreenStackHeaderLeftView,
  ScreenStackItem,
  type HeaderBarButtonItem,
} from "react-native-screens";

import { useTheme } from "@/hooks/use-theme";

/**
 * Navigation bar for one column of the wide layout. iOS 26 draws Liquid Glass
 * from the scroll view in the screen's first-descendant chain. A title painted
 * above the list is neither in that chain nor in the bar, so the header stays
 * a flat page fill. This bar is only as wide as the column: the large title
 * does not span the detail pane, and the list scrolls under the glass.
 */
export function ListColumn({
  title,
  headerLeft,
  headerRightItems,
  children,
}: {
  title: string;
  headerLeft?: ReactNode;
  headerRightItems?: HeaderBarButtonItem[];
  children: ReactNode;
}): ReactNode {
  const { scheme, colors } = useTheme();

  return (
    <ScreenStack style={styles.fill}>
      <ScreenStackItem
        activityState={2}
        gestureEnabled={false}
        screenId="list-column"
        stackAnimation="none"
        style={[styles.fill, { backgroundColor: colors.background }]}
        contentStyle={{ backgroundColor: colors.background }}
        headerConfig={{
          title,
          largeTitle: true,
          largeTitleHideShadow: true,
          hideShadow: true,
          hideBackButton: true,
          backgroundColor: "transparent",
          largeTitleBackgroundColor: "transparent",
          color: colors.primary,
          titleColor: colors.foreground,
          largeTitleColor: colors.foreground,
          translucent: true,
          experimental_userInterfaceStyle: scheme,
          headerRightBarButtonItems: headerRightItems,
          children: headerLeft ? (
            <ScreenStackHeaderLeftView
              hidesSharedBackground
              style={styles.logo}
            >
              {headerLeft}
            </ScreenStackHeaderLeftView>
          ) : undefined,
        }}
      >
        {children}
      </ScreenStackItem>
    </ScreenStack>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  logo: { width: 28, height: 28 },
});
