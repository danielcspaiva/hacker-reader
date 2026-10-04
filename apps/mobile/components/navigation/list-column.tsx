import type { ReactNode } from "react";
import type { HeaderBarButtonItem } from "react-native-screens";

/**
 * Wide-list header. iOS (`list-column.ios.tsx`) draws a column navigation bar.
 * Other platforms render the list as-is; the caller draws its own title.
 */
export function ListColumn({
  children,
}: {
  title: string;
  headerLeft?: ReactNode;
  headerRightItems?: HeaderBarButtonItem[];
  children: ReactNode;
}): ReactNode {
  return children;
}
