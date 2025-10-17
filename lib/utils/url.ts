/**
 * Extracts the domain from a URL, removing 'www.' prefix
 * @param url Full URL string
 * @returns Domain name or null if invalid URL
 */
export function getDomain(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return null;
  }
}
