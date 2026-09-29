import { OG_USER_AGENT } from "../hn/constants";
import { decodeEntitiesExtended } from "../html/entities";

export interface OGMetadata {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  siteName?: string;
}

const TIMEOUT_MS = 5000;
const HEAD_SIZE_LIMIT = 50000;

async function fetchWithTimeout(
  url: string,
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
    return await fetch(url, { ...fetchInit, signal: controller.signal });
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
      metaTags[key.toLowerCase()] = decodeEntitiesExtended(value);
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
        "User-Agent": OG_USER_AGENT,
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
  } catch {
    // Timeouts, aborts and network failures all mean "no preview".
    return null;
  }
}
