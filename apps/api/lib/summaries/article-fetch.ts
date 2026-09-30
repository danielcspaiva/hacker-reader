export const ARTICLE_TIMEOUT_MS = 6000;
export const ARTICLE_MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 3;

/**
 * Story URLs are user submitted, so the server must not be pointed at its own
 * network. Only public-looking http(s) hosts pass: no IP literals (IPv6 at all,
 * private/loopback/link-local IPv4), no single-label or internal names, no odd
 * ports. DNS answers are not resolved here, so this is a first line of defence.
 */
export function isSafeArticleUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (url.port && url.port !== "80" && url.port !== "443") return null;

  const host = url.hostname.toLowerCase();
  if (host.startsWith("[")) return null;
  if (!host.includes(".")) return null;
  if (/\.(local|localhost|internal|lan|home|corp|intranet)$/.test(host)) {
    return null;
  }
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ipv4) {
    const [a = 0, b = 0] = ipv4.slice(1).map(Number);
    const privateRange =
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168);
    if (privateRange) return null;
  }
  // Numeric-looking hosts that are not dotted quads (decimal/hex IPv4 forms).
  if (/^[\d.x]+$/i.test(host) && !ipv4) return null;
  return url;
}

function isHtml(contentType: string | null): boolean {
  return /^(text\/html|application\/xhtml\+xml)\b/i.test(contentType ?? "");
}

function charsetOf(contentType: string | null): string {
  return /charset=["']?([\w-]+)/i.exec(contentType ?? "")?.[1] ?? "utf-8";
}

async function readCapped(
  response: Response,
  maxBytes: number
): Promise<Uint8Array | null> {
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.byteLength;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const bytes = new Uint8Array(Math.min(total, maxBytes));
  let offset = 0;
  for (const chunk of chunks) {
    const room = bytes.length - offset;
    if (room <= 0) break;
    bytes.set(chunk.subarray(0, room), offset);
    offset += Math.min(chunk.byteLength, room);
  }
  return bytes;
}

export interface ArticleFetchOptions {
  fetch?: typeof fetch;
  timeoutMs?: number;
  maxBytes?: number;
}

/**
 * The article's HTML, or null when it cannot be had: unsafe URL, timeout,
 * error status, a non-HTML content type, or no body. Never throws (the
 * article is optional; the discussion is still worth summarising). Bodies
 * beyond `maxBytes` are cut, since the readable text is near the start.
 */
export async function fetchArticleHtml(
  rawUrl: string,
  options: ArticleFetchOptions = {}
): Promise<string | null> {
  const doFetch = options.fetch ?? fetch;
  const maxBytes = options.maxBytes ?? ARTICLE_MAX_BYTES;
  const signal = AbortSignal.timeout(options.timeoutMs ?? ARTICLE_TIMEOUT_MS);

  try {
    let url = isSafeArticleUrl(rawUrl);
    for (let hop = 0; url && hop <= MAX_REDIRECTS; hop++) {
      const response = await doFetch(url.href, {
        redirect: "manual",
        signal,
        headers: {
          "User-Agent": "HackerReaderBot/1.0 (story summaries)",
          Accept: "text/html,application/xhtml+xml",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        await response.body?.cancel().catch(() => {});
        url = location ? isSafeArticleUrl(new URL(location, url).href) : null;
        continue;
      }
      if (!response.ok) return null;

      const contentType = response.headers.get("content-type");
      if (!isHtml(contentType)) {
        await response.body?.cancel().catch(() => {});
        return null;
      }
      const bytes = await readCapped(response, maxBytes);
      if (!bytes) return null;
      try {
        return new TextDecoder(charsetOf(contentType)).decode(bytes);
      } catch {
        return new TextDecoder("utf-8").decode(bytes);
      }
    }
    return null;
  } catch {
    return null;
  }
}
