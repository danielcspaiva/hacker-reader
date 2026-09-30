import { createContext, useContext } from "react";

interface StorySelection {
  selectedId: number | null;
  select: (id: number) => void;
}

/** Set by `StorySplitView` on wide windows; null where cards push instead. */
export const StorySelectionContext = createContext<StorySelection | null>(null);

export function useStorySelection() {
  return useContext(StorySelectionContext);
}
