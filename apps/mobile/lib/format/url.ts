export function getDomain(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

const TRACKING_PARAM =
  /^(utm_.*|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|igshid|ref_src|_hsenc|_hsmi)$/i;

/**
 * A comparable form of a link for "has this been submitted?" lookups: no
 * scheme, `www.`, fragment, tracking parameters (`utm_*`, `fbclid`, ...) or
 * trailing slash; host lowercased, remaining query parameters kept in order.
 * Null when `input` is not an http(s) URL.
 */
export function normalizeUrl(input: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(input.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  const kept = [...parsed.searchParams.entries()].filter(
    ([name]) => !TRACKING_PARAM.test(name)
  );
  const query = kept.length
    ? `?${kept.map(([k, v]) => (v ? `${k}=${v}` : k)).join("&")}`
    : "";
  const path = parsed.pathname.replace(/\/+$/, "");
  const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
  return `${host}${path}${query}`;
}

export interface SharedLink {
  url: string;
  /** Text shared alongside the link, usable as a title suggestion. */
  title?: string;
}

const MAX_SHARED_TITLE = 200;

/**
 * The link in a share: a `url` payload as is, else the first http(s) URL in a
 * text payload (the rest of that text, when short, is the title suggestion).
 * Null when nothing shared contains a link.
 */
export function extractSharedLink(
  payloads: readonly { value: string; shareType: string }[]
): SharedLink | null {
  for (const payload of payloads) {
    if (payload.shareType === "url" && normalizeUrl(payload.value)) {
      return { url: payload.value.trim() };
    }
  }
  for (const payload of payloads) {
    if (payload.shareType !== "text") continue;
    const match = /https?:\/\/[^\s<>"]+/i.exec(payload.value);
    if (!match || !normalizeUrl(match[0])) continue;
    const title = payload.value
      .replace(match[0], " ")
      .replace(/\s+/g, " ")
      .trim();
    const link: SharedLink = { url: match[0] };
    if (title && title.length <= MAX_SHARED_TITLE) link.title = title;
    return link;
  }
  return null;
}
