export interface OGMetadata {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  siteName?: string;
}

/**
 * Decodes HTML entities in meta tag content
 */
function decodeHTMLEntities(text: string): string {
  // Named entity lookup map for common entities
  const namedEntities: Record<string, string> = {
    'quot': '"',
    'amp': '&',
    'lt': '<',
    'gt': '>',
    'apos': "'",
    'nbsp': ' ',
    'mdash': '—',
    'ndash': '–',
    'hellip': '…',
    'lsquo': '\u2018',
    'rsquo': '\u2019',
    'ldquo': '\u201C',
    'rdquo': '\u201D',
    'copy': '©',
    'reg': '®',
    'trade': '™',
    'bull': '•',
    'deg': '°',
    'euro': '€',
    'pound': '£',
    'times': '×',
    'divide': '÷',
    'minus': '−',
  };

  return text
    // Decode numeric entities (decimal: &#39;)
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    // Decode hex entities (hex: &#x27; or &#X27;)
    .replace(/&#x([0-9a-fA-F]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    // Decode named entities (&quot;, &mdash;, etc.)
    .replace(/&([a-z]+);/gi, (match, name) => namedEntities[name.toLowerCase()] || match);
}

const TIMEOUT_MS = 5000; // 5 second timeout
const HEAD_SIZE_LIMIT = 50000; // 50KB should be enough for <head> section

/**
 * Extract all relevant meta tags in a single pass for better performance
 */
function extractAllMetaTags(html: string): Record<string, string> {
  const metaTags: Record<string, string> = {};

  // Single regex to capture all meta tags with property/name and content
  const metaRegex = /<meta[^>]*(?:property|name)=["']([^"']*)["'][^>]*content=["']([^"']*)["'][^>]*>|<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']([^"']*)["'][^>]*>/gi;

  let match;
  while ((match = metaRegex.exec(html)) !== null) {
    const key = match[1] || match[4];
    const value = match[2] || match[3];
    if (key && value) {
      metaTags[key.toLowerCase()] = decodeHTMLEntities(value);
    }
  }

  return metaTags;
}

export async function fetchOGMetadata(
  url: string,
  signal?: AbortSignal
): Promise<OGMetadata | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  // Chain the abort signals
  const abortHandler = () => controller.abort();
  if (signal) {
    signal.addEventListener('abort', abortHandler);
  }

  try {
    // Fetch the HTML directly with timeout
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HNClient/1.0)',
      },
    });

    if (!response.ok) {
      return null;
    }

    // Read response as text (simpler and works across platforms)
    const fullText = await response.text();

    // Truncate to HEAD_SIZE_LIMIT if needed (meta tags are in <head>)
    const text = fullText.length > HEAD_SIZE_LIMIT
      ? fullText.substring(0, HEAD_SIZE_LIMIT)
      : fullText;

    // Extract just the head section for better performance
    const headMatch = text.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const headContent = headMatch ? headMatch[1] : text;

    // Extract all meta tags in a single pass
    const metaTags = extractAllMetaTags(headContent);

    // Get OG tags with Twitter fallbacks
    const image = metaTags['og:image'] || metaTags['twitter:image'];
    const title = metaTags['og:title'] || metaTags['twitter:title'];
    const description = metaTags['og:description'] || metaTags['twitter:description'] || metaTags['description'];
    const siteName = metaTags['og:site_name'];

    // Only return if we have at least an image
    if (!image) {
      return null;
    }

    const result: OGMetadata = { url, image };
    if (title) result.title = title;
    if (description) result.description = description;
    if (siteName) result.siteName = siteName;

    return result;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return null;
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener('abort', abortHandler);
    }
  }
}
