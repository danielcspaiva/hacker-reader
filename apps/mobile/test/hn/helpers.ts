import { SecureSession } from "@/lib/hn/session";
import { hnRateLimiter } from "@/lib/hn/web/rate-limiter";

export interface RecordedCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
}

export interface FakeReply {
  body?: string;
  status?: number;
  statusText?: string;
  url?: string;
  json?: unknown;
  contentType?: string;
}

export const FAKE_COOKIE = "user=fakeuser&FAKETOKEN12345; other=1";

export function fakeSession(): SecureSession {
  return new SecureSession({ user: "fakeuser&FAKETOKEN12345", other: "1" });
}

/**
 * Replaces globalThis.fetch with a scripted fake. Replies are consumed in order;
 * every request is recorded. Returns restore() and the recorded calls.
 */
export function installFetch(replies: FakeReply[]) {
  const calls: RecordedCall[] = [];
  const original = globalThis.fetch;
  let index = 0;

  const fakeFetch = async (
    input: string | URL | Request,
    init?: RequestInit
  ) => {
    const reply = replies[index++];
    if (!reply) throw new Error(`unexpected fetch #${index}: ${String(input)}`);
    calls.push({
      url: String(input),
      method: init?.method ?? "GET",
      // SAFETY: the code under test only ever passes plain header objects.
      headers: { ...(init?.headers as Record<string, string> | undefined) },
      body: init?.body?.toString(),
    });
    const response = new Response(
      reply.json !== undefined
        ? JSON.stringify(reply.json)
        : (reply.body ?? ""),
      {
        status: reply.status ?? 200,
        statusText: reply.statusText ?? "",
        headers: reply.contentType ? { "content-type": reply.contentType } : {},
      }
    );
    // `Response.url` is read-only and empty for a constructed response.
    Object.defineProperty(response, "url", {
      value: reply.url ?? String(input),
    });
    return response;
  };
  globalThis.fetch = fakeFetch;

  return {
    calls,
    restore() {
      globalThis.fetch = original;
    },
  };
}

export function resetRateLimiter() {
  hnRateLimiter.reset();
}
