/** Window width (pt) from which the app uses its two-pane layout. */
export const WIDE_LAYOUT_MIN_WIDTH = 768;

/** Width of the list column in the two-pane layout. */
export const SIDEBAR_WIDTH = 400;

/** Widest a line of reading content gets before it is centred with margins. */
export const READABLE_MAX_WIDTH = 720;

/** iPad, or a large landscape window: wide enough for list and detail side by side. */
export function isWideLayout(width: number) {
  return width >= WIDE_LAYOUT_MIN_WIDTH;
}

/**
 * Horizontal padding that centres content capped at `READABLE_MAX_WIDTH`
 * inside a container `width` wide; never less than `minimum`.
 */
export function readableGutter(width: number, minimum: number) {
  return Math.max(minimum, (width - READABLE_MAX_WIDTH) / 2);
}
