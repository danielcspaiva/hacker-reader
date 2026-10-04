/**
 * Jump targets between top-level (depth 0) comments. `depths` is the depth of
 * every row in the list; `visibleIndex` is the first row on screen, or -1 when
 * no comment row is visible yet (the story header still fills the screen).
 * Both return a row index, or undefined when there is nowhere to go.
 */

/** The first top-level comment below the current row. */
export function nextTopLevelIndex(
  depths: readonly number[],
  visibleIndex: number
): number | undefined {
  for (let i = Math.max(visibleIndex + 1, 0); i < depths.length; i++) {
    if (depths[i] === 0) return i;
  }
  return undefined;
}

/**
 * The top-level comment before the current one. Sitting inside a thread
 * (on a reply), it goes to the start of that thread first.
 */
export function previousTopLevelIndex(
  depths: readonly number[],
  visibleIndex: number
): number | undefined {
  if (visibleIndex < 0) return undefined;
  const start = Math.min(visibleIndex, depths.length - 1);
  // A reply row belongs to the thread that started above it.
  const from = depths[start] === 0 ? start - 1 : start;
  for (let i = from; i >= 0; i--) {
    if (depths[i] === 0) return i;
  }
  return undefined;
}

/** Whether there are enough top-level comments for the jump control. */
export function hasThreadsToJump(depths: readonly number[]): boolean {
  let count = 0;
  for (const depth of depths) {
    if (depth === 0 && ++count >= 2) return true;
  }
  return false;
}
