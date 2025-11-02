/**
 * Converts a Unix timestamp to a human-readable relative time string
 * @param timestamp Unix timestamp in seconds
 * @returns Formatted string like "2m ago", "3h ago", "5d ago"
 */
export function timeAgo(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = now - timestamp;

  if (diff < 3600) {
    return `${Math.floor(diff / 60)}m`;
  }
  if (diff < 86400) {
    return `${Math.floor(diff / 3600)}h`;
  }
  return `${Math.floor(diff / 86400)}d`;
}
