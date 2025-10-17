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
  return text
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

function extractMetaTag(html: string, property: string): string | undefined {
  // Match both property="og:xxx" and name="xxx" formats
  const propertyRegex = new RegExp(
    `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["'][^>]*>`,
    'i'
  );
  const contentRegex = new RegExp(
    `<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["'][^>]*>`,
    'i'
  );

  const match = html.match(propertyRegex) || html.match(contentRegex);
  return match ? decodeHTMLEntities(match[1]) : undefined;
}

const TIMEOUT_MS = 5000; // 5 second timeout
const MAX_RESPONSE_SIZE = 50000; // 50KB max to avoid huge downloads

export async function fetchOGMetadata(
  url: string,
  signal?: AbortSignal
): Promise<OGMetadata | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  // Chain the abort signals
  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  try {
    if (__DEV__) {
      console.log('[OG] Fetching metadata for:', url);
    }

    // Fetch the HTML directly with timeout
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HNClient/1.0)',
        // Request only the first chunk - some servers support Range header
        'Range': 'bytes=0-4096',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (__DEV__) {
        console.log('[OG] Response not ok:', response.status);
      }
      return null;
    }

    // Read response as text (simpler and works across platforms)
    const fullText = await response.text();

    if (__DEV__) {
      console.log('[OG] Fetched HTML length:', fullText.length);
      if (fullText.length > MAX_RESPONSE_SIZE) {
        console.log('[OG] Response too large, truncating to', MAX_RESPONSE_SIZE, 'characters');
      }
    }

    // Truncate to MAX_RESPONSE_SIZE if needed
    const text = fullText.length > MAX_RESPONSE_SIZE
      ? fullText.substring(0, MAX_RESPONSE_SIZE)
      : fullText;

    // Extract just the head section for better performance
    const headMatch = text.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const headContent = headMatch ? headMatch[1] : text;

    // Extract OpenGraph meta tags
    const ogImage = extractMetaTag(headContent, 'og:image');
    const ogTitle = extractMetaTag(headContent, 'og:title');
    const ogDescription = extractMetaTag(headContent, 'og:description');
    const ogSiteName = extractMetaTag(headContent, 'og:site_name');

    // Fallback to standard meta tags if OG tags aren't available
    const title = ogTitle || extractMetaTag(headContent, 'twitter:title');
    const description = ogDescription || extractMetaTag(headContent, 'twitter:description') || extractMetaTag(headContent, 'description');
    const image = ogImage || extractMetaTag(headContent, 'twitter:image');

    if (__DEV__) {
      console.log('[OG] Extracted - title:', title, 'image:', image);
    }

    // Only return if we have at least an image
    if (!image) {
      if (__DEV__) {
        console.log('[OG] No image found, returning null');
      }
      return null;
    }

    return {
      title: title || undefined,
      description: description || undefined,
      image: image || undefined,
      url,
      siteName: ogSiteName || undefined,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      if (__DEV__) {
        console.log('[OG] Request aborted or timeout');
      }
      return null;
    }

    if (__DEV__) {
      console.error('[OG] Failed to fetch OG metadata:', error);
    }
    return null;
  }
}
