import { decodeEntities } from "./entities";

export type ParsedHTMLPart =
  | { type: "text"; content: string }
  | { type: "link"; content: string; url: string }
  | { type: "code"; content: string };

export function stripHTML(html: string): string {
  return decodeEntities(
    html
      .replace(/<p>/g, "\n\n")
      .replace(/<\/p>/g, "")
      .replace(/<i>(.*?)<\/i>/g, "$1")
      .replace(/<b>(.*?)<\/b>/g, "$1")
      .replace(/<a[^>]*>(.*?)<\/a>/g, "$1")
  ).trim();
}

export function parseHTMLWithLinks(html?: string): ParsedHTMLPart[] | null {
  if (!html) return null;

  let processed = html
    .replace(/<p>/g, "\n\n")
    .replace(/<\/p>/g, "")
    .replace(/<i>/g, "")
    .replace(/<\/i>/g, "");

  const combinedRegex =
    /(<a\s+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>)|(<pre><code>([\s\S]*?)<\/code><\/pre>)|(<code>(.*?)<\/code>)/g;
  const parts: ParsedHTMLPart[] = [];
  let lastIndex = 0;
  let match;

  while ((match = combinedRegex.exec(processed)) !== null) {
    if (match.index > lastIndex) {
      const textBefore = decodeEntities(
        processed.substring(lastIndex, match.index)
      );
      if (textBefore.trim()) {
        parts.push({ type: "text", content: textBefore });
      }
    }

    if (match[1]) {
      parts.push({
        type: "link",
        content: decodeEntities(match[3]),
        url: decodeEntities(match[2]),
      });
    } else if (match[4]) {
      // Pre/code block matched: <pre><code>...</code></pre>
      parts.push({
        type: "code",
        content: decodeEntities(match[5]),
      });
    } else if (match[6]) {
      // Inline code matched: <code>...</code>
      parts.push({
        type: "code",
        content: decodeEntities(match[7]),
      });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < processed.length) {
    const textAfter = decodeEntities(processed.substring(lastIndex));
    if (textAfter.trim()) {
      parts.push({ type: "text", content: textAfter });
    }
  }

  return parts;
}
