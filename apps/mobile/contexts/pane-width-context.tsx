import { createContext, useContext, type ReactNode } from "react";
import { useWindowDimensions } from "react-native";

import { GUTTER } from "@/constants/theme";
import { readableGutter } from "@/lib/layout/breakpoints";

const PaneWidthContext = createContext<number | null>(null);

/** Tells descendants how wide their pane is, when that is not the window. */
export function PaneWidthProvider({
  width,
  children,
}: {
  width: number;
  children: ReactNode;
}) {
  return (
    <PaneWidthContext.Provider value={width}>
      {children}
    </PaneWidthContext.Provider>
  );
}

/** Width of the pane the caller renders in (the window outside a split view). */
export function usePaneWidth() {
  const paneWidth = useContext(PaneWidthContext);
  const { width } = useWindowDimensions();
  return paneWidth ?? width;
}

/**
 * Horizontal padding for a screen's content: the 16 gutter, widened so text
 * stays at a readable measure (max 720, centred) on wide panes.
 */
export function useReadableGutter(minimum = GUTTER) {
  return readableGutter(usePaneWidth(), minimum);
}
