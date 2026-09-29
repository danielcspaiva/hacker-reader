export interface OGMetadata {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  siteName?: string;
}

function decodeHTMLEntities(text: string): string {
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

const TIMEOUT_MS = 5000;
const HEAD_SIZE_LIMIT = 50000;

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = TIMEOUT_MS, signal: parentSignal, ...fetchInit } = init;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const abortFromParent = () => controller.abort();
  if (parentSignal?.aborted) {
    controller.abort();
  } else {
    parentSignal?.addEventListener("abort", abortFromParent, { once: true });
  }

  try {
    // expo/fetch accepts string | Request, not URL.
    return await fetch(input instanceof URL ? input.toString() : input, {
      ...fetchInit,
      // SAFETY: RN/expo fetch AbortSignal is the same runtime object as
      // DOM AbortSignal; the mismatch is a lib type gap, not a value gap.
      signal: controller.signal as never,
    });
  } finally {
    clearTimeout(timeoutId);
    parentSignal?.removeEventListener("abort", abortFromParent);
  }
}

function extractAllMetaTags(html: string): Record<string, string> {
  const metaTags: Record<string, string> = {};

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

  try {
    const response = await fetchWithTimeout(imageUrl, {
      method: "HEAD",
      timeout: 4000,
      signal: parentSignal,
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
  }
}

export async function fetchOGMetadata(
  url: string,
  signal?: AbortSignal
): Promise<OGMetadata | null> {
  if (signal?.aborted) {
    return null;
  }

  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HNClient/1.0)",
      },
      signal,
    });

    if (!response.ok) {
      return null;
    }

    const fullText = await response.text();

    const text =
      fullText.length > HEAD_SIZE_LIMIT
        ? fullText.substring(0, HEAD_SIZE_LIMIT)
        : fullText;

    const headMatch = text.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const headContent = headMatch ? headMatch[1] : text;

    const metaTags = extractAllMetaTags(headContent);

    const rawImage = metaTags["og:image"] || metaTags["twitter:image"];
    const title = metaTags["og:title"] || metaTags["twitter:title"];
    const description =
      metaTags["og:description"] ||
      metaTags["twitter:description"] ||
      metaTags["description"];
    const siteName = metaTags["og:site_name"];

    let image = rawImage ? resolveImageUrl(url, rawImage) : null;

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
  }
}
