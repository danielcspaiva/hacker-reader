import { useState } from "react";

/** The story open in the split view's detail pane (null: nothing selected). */
export function useSelectedStoryId() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  return { selectedId, select: setSelectedId };
}
