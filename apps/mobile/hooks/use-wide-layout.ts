import { useWindowDimensions } from "react-native";

import { isWideLayout } from "@/lib/layout/breakpoints";

/** True when the window is wide enough for the iPad list-and-detail split. */
export function useWideLayout(): boolean {
  const { width } = useWindowDimensions();
  return isWideLayout(width);
}
