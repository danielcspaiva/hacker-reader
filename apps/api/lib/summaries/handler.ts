import { requirePro } from "../auth";
import type { EntitlementDeps } from "../entitlement";
import { errorResponse, json } from "../http";
import { isFiniteNumber, isJsonObject, type JsonValue } from "../json";
import { limitByIp, rateLimit } from "../rate-limit";
import type { Store } from "../store";
import { extractArticleText, type ExtractedArticle } from "./article-extract";
import { fetchArticleHtml } from "./article-fetch";
import {
  acquireLock,
  MIN_FRESH_MS,
  isSummaryFresh,
  parseBudget,
  readSummary,
  recordTokenUsage,
  releaseLock,
  withinDailyBudget,
  writeSummary,
} from "./cache";
import {
  buildSummaryInput,
  parseAlgoliaStory,
  selectComments,
  type StoryData,
} from "./input";
import {
  DEFAULT_SUMMARY_MODEL,
  SUMMARY_MAX_TOKENS,
  SUMMARY_SCHEMA,
  SYSTEM_PROMPT,
  SummaryError,
  parseModelJson,
  type SummaryLlm,
} from "./model";
import { validateSummaryBody, type StorySummary } from "./output";

/** Per-install cap on summary requests per UTC-aligned day. */
export const DAILY_INSTALL_CAP = 60;
/** Fewer live comments than this and there is no discussion to summarise. */
export const MIN_COMMENTS = 3;

const ALGOLIA_ITEM_URL = "https://hn.algolia.com/api/v1/items";
const FIREBASE_ITEM_URL = "https://hacker-news.firebaseio.com/v0/item";

export interface SummaryDeps {
  store: Store;
  /** Anthropic access; undefined when `ANTHROPIC_API_KEY` is not set. */
  llm?: SummaryLlm | undefined;
  fetch?: typeof fetch;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  /** Overrides for `SUMMARY_MODEL` / `SUMMARY_DAILY_TOKEN_BUDGET`. */
  model?: string;
  dailyTokenBudget?: number;
  /** RevenueCat secret override (tests). */
  secretKey?: string;
  /** How long a request that lost the generation lock waits for the winner. */
  pollIntervalMs?: number;
  pollAttempts?: number;
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Story ids are positive integers; anything else is rejected before any work. */
export function parseStoryId(raw: string): number | null {
  if (!/^\d{1,10}$/.test(raw)) return null;
  const id = Number(raw);
  return id > 0 && id < 2 ** 31 ? id : null;
}

function ready(summary: StorySummary): Response {
  return json({ status: "ready", summary });
}

function generating(): Response {
  return json({ status: "generating" }, 202, { "Retry-After": "3" });
}

async function getJson(
  doFetch: typeof fetch,
  url: string,
  timeoutMs: number
): Promise<{ status: number; body: JsonValue }> {
  const response = await doFetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) return { status: response.status, body: null };
  return { status: response.status, body: await response.json() };
}

/** Current `descendants` from the HN API; null when it cannot be read. */
async function fetchDescendants(
  doFetch: typeof fetch,
  storyId: number
): Promise<number | null> {
  try {
    const { body } = await getJson(
      doFetch,
      `${FIREBASE_ITEM_URL}/${storyId}.json`,
      4000
    );
    const descendants = isJsonObject(body) ? body.descendants : undefined;
    return isFiniteNumber(descendants) ? descendants : null;
  } catch {
    return null;
  }
}

async function loadArticle(
  story: StoryData,
  doFetch: typeof fetch
): Promise<ExtractedArticle | null> {
  if (!story.url) return null;
  let host = "";
  try {
    host = new URL(story.url).hostname;
  } catch {
    return null;
  }
  if (host === "news.ycombinator.com") return null;
  const html = await fetchArticleHtml(story.url, { fetch: doFetch });
  return html ? extractArticleText(html) : null;
}

type Generated =
  | { ok: true; summary: StorySummary }
  | { ok: false; response: Response };

function failure(status: number, code: string, message: string): Generated {
  return { ok: false, response: errorResponse(status, code, message) };
}

/** Fetches the inputs, calls the model, validates and returns the summary. */
async function generate(
  storyId: number,
  llm: SummaryLlm,
  deps: SummaryDeps,
  doFetch: typeof fetch,
  now: () => number
): Promise<Generated> {
  let story: StoryData | null;
  try {
    const { status, body } = await getJson(
      doFetch,
      `${ALGOLIA_ITEM_URL}/${storyId}`,
      10_000
    );
    if (status === 404) return failure(404, "not_found", "Story not found");
    if (status !== 200) throw new Error(`algolia ${status}`);
    story = parseAlgoliaStory(body);
  } catch {
    return failure(
      502,
      "upstream_unavailable",
      "Could not load the story from Hacker News"
    );
  }
  if (!story) return failure(404, "not_found", "Story not found");
  if (story.type === "comment") {
    return failure(422, "not_a_story", "Only stories can be summarised");
  }

  const selection = selectComments(story.comments);
  if (selection.totalComments < MIN_COMMENTS) {
    return failure(
      422,
      "not_enough_comments",
      "There are not enough comments to summarise yet"
    );
  }

  const article = await loadArticle(story, doFetch);
  const input = buildSummaryInput(story, article, selection);
  const model =
    deps.model ?? process.env.SUMMARY_MODEL ?? DEFAULT_SUMMARY_MODEL;

  try {
    const result = await llm.complete({
      model,
      system: SYSTEM_PROMPT,
      user: input.content,
      maxTokens: SUMMARY_MAX_TOKENS,
      schema: SUMMARY_SCHEMA,
    });
    // Billed whatever happens next, so count it before validating.
    await recordTokenUsage(deps.store, result, now());

    const body = validateSummaryBody(parseModelJson(result), {
      validIds: input.commentIds,
      hasSource: input.hasSource,
    });
    if (!body) {
      throw new SummaryError("invalid_output", "Missing discussion summary");
    }
    return {
      ok: true,
      summary: {
        ...body,
        generatedAt: new Date(now()).toISOString(),
        commentCountAtGeneration: input.commentCount,
        model,
      },
    };
  } catch (error) {
    if (error instanceof SummaryError) {
      console.error(`summary ${storyId} failed: ${error.reason}`);
      if (error.reason === "unavailable") {
        return failure(
          503,
          "summary_unavailable",
          "The summary service is busy. Try again in a moment."
        );
      }
      if (error.reason === "refused") {
        return failure(
          422,
          "summary_refused",
          "This story could not be summarised"
        );
      }
      return failure(502, "summary_failed", "Could not generate a summary");
    }
    console.error(`summary ${storyId} failed unexpectedly`);
    return failure(502, "summary_failed", "Could not generate a summary");
  }
}

function secondsUntilUtcMidnight(now: number): number {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return Math.max(1, Math.ceil((next.getTime() - now) / 1000));
}

/**
 * `GET /api/v1/summaries/story/:id`. Order matters: IP limit, then Pro (a
 * RevenueCat lookup), then the per-install daily cap, then the cache. Only a
 * missing or stale summary reaches the model, behind the global token budget
 * and a per-story lock so concurrent requests generate it once.
 */
export async function handleStorySummary(
  req: Request,
  rawId: string,
  deps: SummaryDeps
): Promise<Response> {
  const { store } = deps;
  const doFetch = deps.fetch ?? fetch;
  const now = deps.now ?? Date.now;
  const sleep = deps.sleep ?? defaultSleep;

  const blocked = await limitByIp(store, req, "summaries");
  if (blocked) return blocked;

  const entitlementDeps: EntitlementDeps = { store, now };
  if (deps.fetch) entitlementDeps.fetch = deps.fetch;
  if (deps.secretKey) entitlementDeps.secretKey = deps.secretKey;
  const auth = await requirePro(req, entitlementDeps);
  if (!auth.ok) return auth.response;

  const storyId = parseStoryId(rawId);
  if (storyId === null) {
    return errorResponse(400, "invalid_id", "Invalid story id");
  }

  const cap = await rateLimit(
    store,
    "summary-daily",
    auth.installId,
    { limit: DAILY_INSTALL_CAP, windowSeconds: 24 * 60 * 60 },
    now()
  );
  if (!cap.ok) {
    return errorResponse(
      429,
      "daily_limit",
      "You have reached today's summary limit",
      { "Retry-After": String(cap.retryAfterSeconds) }
    );
  }

  const cached = await readSummary(store, storyId);
  if (cached) {
    const age = now() - Date.parse(cached.generatedAt);
    // Young summaries are served without looking at the thread at all.
    const descendants =
      age < MIN_FRESH_MS ? null : await fetchDescendants(doFetch, storyId);
    if (isSummaryFresh(cached, descendants, now())) return ready(cached);
  }

  if (!deps.llm) {
    return errorResponse(
      503,
      "summaries_unavailable",
      "AI summaries are not available right now"
    );
  }
  const budget =
    deps.dailyTokenBudget ??
    parseBudget(process.env.SUMMARY_DAILY_TOKEN_BUDGET);
  if (!(await withinDailyBudget(store, budget, now()))) {
    // A stale summary is still better than none while the budget is spent.
    if (cached) return ready(cached);
    return errorResponse(
      503,
      "summaries_paused",
      "AI summaries are paused for today. Please try again tomorrow.",
      { "Retry-After": String(secondsUntilUtcMidnight(now())) }
    );
  }

  if (!(await acquireLock(store, storyId))) {
    // Someone else is generating this story right now.
    if (cached) return ready(cached);
    const attempts = deps.pollAttempts ?? 8;
    for (let i = 0; i < attempts; i++) {
      await sleep(deps.pollIntervalMs ?? 1500);
      const done = await readSummary(store, storyId);
      if (done && isSummaryFresh(done, null, now())) return ready(done);
    }
    return generating();
  }

  try {
    const result = await generate(storyId, deps.llm, deps, doFetch, now);
    if (!result.ok) {
      // A stale summary still beats an error when regeneration fails.
      return cached && result.response.status >= 500
        ? ready(cached)
        : result.response;
    }
    await writeSummary(store, storyId, result.summary);
    return ready(result.summary);
  } finally {
    await releaseLock(store, storyId);
  }
}
