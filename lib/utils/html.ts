interface ParsedHTMLPart {
  type: 'text' | 'link';
  content: string;
  url?: string;
}

/**
 * Decodes HTML entities to their character equivalents
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&#x2F;/g, '/')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

/**
 * Parses HTML string and extracts text and links into structured parts
 * Handles HN comment/story HTML format with <p> tags and <a> tags
 * @param html Raw HTML string from HN API
 * @returns Array of parsed parts (text and links) or null if no HTML
 */
export function parseHTMLWithLinks(html?: string): ParsedHTMLPart[] | null {
  if (!html) return null;

  // Replace paragraph tags with newlines
  let processed = html
    .replace(/<p>/g, '\n\n')
    .replace(/<\/p>/g, '')
    .replace(/<i>/g, '')
    .replace(/<\/i>/g, '');

  // Match <a href="url">text</a> patterns
  const linkRegex = /<a\s+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/g;
  const parts: ParsedHTMLPart[] = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(processed)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      const textBefore = decodeEntities(processed.substring(lastIndex, match.index));
      if (textBefore) {
        parts.push({ type: 'text', content: textBefore });
      }
    }

    // Add the link
    parts.push({
      type: 'link',
      content: decodeEntities(match[2]),
      url: decodeEntities(match[1]),
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < processed.length) {
    const textAfter = decodeEntities(processed.substring(lastIndex));
    if (textAfter) {
      parts.push({ type: 'text', content: textAfter });
    }
  }

  return parts;
}
