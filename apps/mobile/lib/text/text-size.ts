export const TEXT_SIZES = ["small", "default", "large", "xlarge"] as const;

export type TextSize = (typeof TEXT_SIZES)[number];

export const DEFAULT_TEXT_SIZE: TextSize = "default";

/** Multiplier on the variant's font size and line height (stacks on Dynamic Type). */
export const TEXT_SIZE_SCALE: Record<TextSize, number> = {
  small: 0.9,
  default: 1,
  large: 1.15,
  xlarge: 1.3,
};

export const TEXT_SIZE_LABELS: Record<TextSize, string> = {
  small: "Small",
  default: "Default",
  large: "Large",
  xlarge: "Extra Large",
};

export function isTextSize(value: unknown): value is TextSize {
  return TEXT_SIZES.some((size) => size === value);
}

/** Scales a point size, rounded to whole points so lines stay crisp. */
export function scaleFont(size: number, scale: number): number {
  return Math.round(size * scale);
}
