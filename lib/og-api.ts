export interface OGMetadata {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  siteName?: string;
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
  return match ? match[1] : undefined;
}

export async function fetchOGMetadata(url: string): Promise<OGMetadata | null> {
  try {
    console.log('[OG] Fetching metadata for:', url);

    // Fetch the HTML directly
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HNClient/1.0)',
      },
    });

    if (!response.ok) {
      console.log('[OG] Response not ok:', response.status);
      return null;
    }

    const html = await response.text();
    console.log('[OG] Fetched HTML length:', html.length);

    // Extract OpenGraph meta tags
    const ogImage = extractMetaTag(html, 'og:image');
    const ogTitle = extractMetaTag(html, 'og:title');
    const ogDescription = extractMetaTag(html, 'og:description');
    const ogSiteName = extractMetaTag(html, 'og:site_name');

    // Fallback to standard meta tags if OG tags aren't available
    const title = ogTitle || extractMetaTag(html, 'twitter:title');
    const description = ogDescription || extractMetaTag(html, 'twitter:description') || extractMetaTag(html, 'description');
    const image = ogImage || extractMetaTag(html, 'twitter:image');

    console.log('[OG] Extracted - title:', title, 'image:', image);

    // Only return if we have at least an image
    if (!image) {
      console.log('[OG] No image found, returning null');
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
    console.error('[OG] Failed to fetch OG metadata:', error);
    return null;
  }
}
