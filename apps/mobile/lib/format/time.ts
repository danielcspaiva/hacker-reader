type AgeUnit = "minute" | "hour" | "day" | "week" | "year";

/** Whole units elapsed since `timestamp` (seconds), or null under a minute. */
function age(timestamp: number): { value: number; unit: AgeUnit } | null {
  const diff = Date.now() / 1000 - timestamp;

  if (diff < 60) return null;
  if (diff < 3600) return { value: Math.floor(diff / 60), unit: "minute" };
  if (diff < 86400) return { value: Math.floor(diff / 3600), unit: "hour" };
  const days = Math.floor(diff / 86400);
  if (days < 7) return { value: days, unit: "day" };
  if (days < 365) return { value: Math.floor(days / 7), unit: "week" };
  return { value: Math.floor(days / 365), unit: "year" };
}

/** Compact age for display: "now", "5m", "3h", "2d", "1w", "4y". */
export function timeAgo(timestamp: number): string {
  const a = age(timestamp);
  return a ? `${a.value}${a.unit[0]}` : "now";
}

/** Spoken age for accessibility labels: "just now", "5 minutes ago". */
export function timeAgoSpoken(timestamp: number): string {
  const a = age(timestamp);
  if (!a) return "just now";
  return `${a.value} ${a.unit}${a.value === 1 ? "" : "s"} ago`;
}

export function formatMemberSince(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}
