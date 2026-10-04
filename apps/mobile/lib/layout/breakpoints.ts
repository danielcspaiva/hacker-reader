/** Window width (pt) from which the app uses its two-pane layout. */
export const WIDE_LAYOUT_MIN_WIDTH = 768;

/** Landscape list column. Portrait uses {@link sidebarWidth}. */
export const SIDEBAR_WIDTH = 400;

/**
 * Portrait list column as a fraction of the window. 0.42 keeps the article
 * the wider pane on an 11" iPad (350 of 834) without crushing story cards.
 * The upper clamp holds a 13" iPad at {@link SIDEBAR_WIDTH}.
 */
const PORTRAIT_SIDEBAR_FRACTION = 0.42;
const PORTRAIT_SIDEBAR_MIN = 300;

/**
 * List column width. Landscape stays at {@link SIDEBAR_WIDTH}. Portrait
 * shrinks the list so the article is the wider pane, clamped so a card
 * still has room and a large iPad does not grow the list past the landscape width.
 */
export function sidebarWidth(width: number, height: number): number {
  if (height <= width) return SIDEBAR_WIDTH;
  const preferred = Math.round(width * PORTRAIT_SIDEBAR_FRACTION);
  return Math.min(SIDEBAR_WIDTH, Math.max(PORTRAIT_SIDEBAR_MIN, preferred));
}

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
