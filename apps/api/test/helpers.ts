import { readFileSync } from "node:fs";

import type { JsonValue } from "../lib/json";

export type FetchHandler = (
  url: string,
  init: RequestInit | undefined
) => Response | Promise<Response>;

/** A `fetch` stand-in backed by `handler`. */
export function fakeFetch(handler: FetchHandler): typeof fetch {
  // SAFETY: the code under test only ever calls fetch(url, init) with a string
  // url, so the narrower signature is all the fake has to honour.
  return ((input: string, init?: RequestInit) =>
    Promise.resolve(handler(input, init))) as typeof fetch;
}

export function readFixture(name: string): JsonValue {
  return JSON.parse(
    readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8")
  );
}
