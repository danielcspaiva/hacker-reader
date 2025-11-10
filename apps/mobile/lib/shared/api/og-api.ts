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
    quot: '"',
    amp: "&",
    lt: "<",
    gt: ">",
    apos: "'",
    nbsp: " ",
    mdash: "—",
    ndash: "–",
    hellip: "…",
    lsquo: "\u2018",
    rsquo: "\u2019",
    ldquo: "\u201C",
    rdquo: "\u201D",
    copy: "©",
    reg: "®",
    trade: "™",
    bull: "•",
    deg: "°",
    euro: "€",
    pound: "£",
    times: "×",
    divide: "÷",
    minus: "−",
  };

  return (
    text
      // Decode numeric entities (decimal: &#39;)
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
      // Decode hex entities (hex: &#x27; or &#X27;)
      .replace(/&#x([0-9a-fA-F]+);/gi, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      )
      // Decode named entities (&quot;, &mdash;, etc.)
      .replace(
        /&([a-z]+);/gi,
        (match, name) => namedEntities[name.toLowerCase()] || match
      )
  );
}

const TIMEOUT_MS = 5000; // 5 second timeout
const HEAD_SIZE_LIMIT = 50000; // 50KB should be enough for <head> section

/**
 * Type-safe fetch wrapper that handles AbortController signal type incompatibility
 * between React Native and Web APIs
 */
async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = TIMEOUT_MS, ...fetchInit } = init;
  const controller = new AbortController();

  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // The signal types are compatible at runtime, just not in TypeScript
    const response = await fetch(input, {
      ...fetchInit,
      signal: controller.signal as never,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Extract all relevant meta tags in a single pass for better performance
 */
function extractAllMetaTags(html: string): Record<string, string> {
  const metaTags: Record<string, string> = {};

  // Single regex to capture all meta tags with property/name and content
  const metaRegex =
    /<meta[^>]*(?:property|name)=["']([^"']*)["'][^>]*content=["']([^"']*)["'][^>]*>|<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']([^"']*)["'][^>]*>/gi;

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

function resolveImageUrl(baseUrl: string, imagePath: string): string | null {
  try {
    if (!imagePath) {
      return null;
    }

    if (imagePath.startsWith("//")) {
      return new URL(`https:${imagePath}`).toString();
    }

    return new URL(imagePath, baseUrl).toString();
  } catch {
    return null;
  }
}

async function validateImageUrl(
  imageUrl: string,
  parentSignal?: AbortSignal
): Promise<boolean> {
  if (parentSignal?.aborted) {
    return false;
  }

  const controller = new AbortController();
  const abortFromParent = () => controller.abort();

  if (parentSignal) {
    parentSignal.addEventListener("abort", abortFromParent);
  }

  try {
    const response = await fetchWithTimeout(imageUrl, {
      method: "HEAD",
      timeout: 4000,
      signal: controller.signal as never,
    });

    if (!response.ok) {
      return false;
    }

    const contentType = response.headers.get("content-type");
    if (!contentType) {
      return false;
    }

    return contentType.startsWith("image/");
  } catch {
    return false;
  } finally {
    if (parentSignal) {
      parentSignal.removeEventListener("abort", abortFromParent);
    }
  }
}

export async function fetchOGMetadata(
  url: string,
  signal?: AbortSignal
): Promise<OGMetadata | null> {
  if (signal?.aborted) {
    return null;
  }

  const controller = new AbortController();
  const abortHandler = () => controller.abort();

  if (signal) {
    signal.addEventListener("abort", abortHandler);
  }

  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HNClient/1.0)",
      },
      signal: controller.signal as never,
    });

    if (!response.ok) {
      return null;
    }

    // Read response as text (simpler and works across platforms)
    const fullText = await response.text();

    // Truncate to HEAD_SIZE_LIMIT if needed (meta tags are in <head>)
    const text =
      fullText.length > HEAD_SIZE_LIMIT
        ? fullText.substring(0, HEAD_SIZE_LIMIT)
        : fullText;

    // Extract just the head section for better performance
    const headMatch = text.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const headContent = headMatch ? headMatch[1] : text;

    // Extract all meta tags in a single pass
    const metaTags = extractAllMetaTags(headContent);

    // Get OG tags with Twitter fallbacks
    const rawImage = metaTags["og:image"] || metaTags["twitter:image"];
    const title = metaTags["og:title"] || metaTags["twitter:title"];
    const description =
      metaTags["og:description"] ||
      metaTags["twitter:description"] ||
      metaTags["description"];
    const siteName = metaTags["og:site_name"];

    let image = rawImage ? resolveImageUrl(url, rawImage) : null;

    // Ensure image URLs are absolute and HTTPS
    if (image?.startsWith("http://")) {
      image = image.replace("http://", "https://");
    }

    if (image) {
      const isValid = await validateImageUrl(image, signal);
      if (!isValid) {
        image = null;
      }
    }

    if (!image) {
      return null;
    }

    const result: OGMetadata = { url, image };
    if (title) result.title = title;
    if (description) result.description = description;
    if (siteName) result.siteName = siteName;

    return result;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return null;
    }
    return null;
  } finally {
    if (signal) {
      signal.removeEventListener("abort", abortHandler);
    }
  }
}
