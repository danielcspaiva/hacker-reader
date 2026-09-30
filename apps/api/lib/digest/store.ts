import type { Store } from "../store";

export interface DigestStory {
  id: number;
  title: string;
  url: string;
  domain: string;
  points: number;
  comments: number;
  /** One AI sentence on why it matters; empty when the model gave none. */
  blurb: string;
}

export interface Digest {
  /** UTC day the digest was built for, `YYYY-MM-DD`. */
  date: string;
  stories: DigestStory[];
  generatedAt: string;
}

export const DIGEST_TTL_SECONDS = 7 * 24 * 60 * 60;
export const SENT_TTL_SECONDS = 2 * 24 * 60 * 60;
export const BUILD_LOCK_SECONDS = 300;

export const digestKey = (date: string) => `digest:${date}`;
export const digestLockKey = (date: string) => `digest:lock:${date}`;
export const digestSentKey = (installId: string, date: string) =>
  `digest:sent:${installId}:${date}`;

export function readDigest(store: Store, date: string): Promise<Digest | null> {
  return store.get<Digest>(digestKey(date));
}

export function writeDigest(store: Store, digest: Digest): Promise<void> {
  return store.set(digestKey(digest.date), digest, {
    ttlSeconds: DIGEST_TTL_SECONDS,
  });
}
