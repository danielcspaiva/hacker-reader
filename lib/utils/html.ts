interface ParsedHTMLPart {
  type: 'text' | 'link' | 'code';
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

  // Process all elements (links, code blocks, and text) in order
  const combinedRegex = /(<a\s+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>)|(<pre><code>([\s\S]*?)<\/code><\/pre>)|(<code>(.*?)<\/code>)/g;
  const parts: ParsedHTMLPart[] = [];
  let lastIndex = 0;
  let match;

  while ((match = combinedRegex.exec(processed)) !== null) {
    // Add text before this element
    if (match.index > lastIndex) {
      const textBefore = decodeEntities(processed.substring(lastIndex, match.index));
      if (textBefore.trim()) {
        parts.push({ type: 'text', content: textBefore });
      }
    }

    // Check which pattern matched
    if (match[1]) {
      // Link matched: <a href="url">text</a>
      parts.push({
        type: 'link',
        content: decodeEntities(match[3]),
        url: decodeEntities(match[2]),
      });
    } else if (match[4]) {
      // Pre/code block matched: <pre><code>...</code></pre>
      parts.push({
        type: 'code',
        content: decodeEntities(match[5]),
      });
    } else if (match[6]) {
      // Inline code matched: <code>...</code>
      parts.push({
        type: 'code',
        content: decodeEntities(match[7]),
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < processed.length) {
    const textAfter = decodeEntities(processed.substring(lastIndex));
    if (textAfter.trim()) {
      parts.push({ type: 'text', content: textAfter });
    }
  }

  return parts;
}
