import { requireCron } from "../cron";
import { json } from "../http";
import type { JsonValue } from "../json";
import type { Store } from "../store";
import {
  parseBudget,
  recordTokenUsage,
  withinDailyBudget,
} from "../summaries/cache";
import {
  DEFAULT_SUMMARY_MODEL,
  SummaryError,
  parseModelJson,
  type SummaryLlm,
} from "../summaries/model";
import {
  buildDigestInput,
  DIGEST_MAX_TOKENS,
  DIGEST_SCHEMA,
  DIGEST_SYSTEM_PROMPT,
  validateBlurbs,
} from "./model";
import {
  parseSearchResponse,
  searchUrl,
  selectTopStories,
  type Candidate,
} from "./select";
import {
  BUILD_LOCK_SECONDS,
  digestLockKey,
  readDigest,
  writeDigest,
  type Digest,
} from "./store";
import { utcDate } from "./window";

const DAY_SECONDS = 24 * 60 * 60;
/** Fewer stories than this is not worth a "morning" push. */
const MIN_STORIES = 3;

export interface DigestBuildDeps {
  store: Store;
  /** Anthropic access; undefined when `ANTHROPIC_API_KEY` is not set. */
  llm?: SummaryLlm | undefined;
  fetch?: typeof fetch;
  now?: () => number;
  /** Overrides for `SUMMARY_MODEL` / `SUMMARY_DAILY_TOKEN_BUDGET`. */
  model?: string;
  dailyTokenBudget?: number;
  secret?: string;
}

export type DigestBuildStatus =
  | "built"
  | "exists"
  | "locked"
  | "no_llm"
  | "over_budget"
  | "no_stories"
  | "failed";

export interface DigestBuildSummary {
  status: DigestBuildStatus;
  date: string;
  stories?: number;
}

async function fetchCandidates(
  doFetch: typeof fetch,
  nowMs: number
): Promise<Candidate[]> {
  const since = nowMs / 1000 - DAY_SECONDS;
  const response = await doFetch(searchUrl(since), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`algolia ${response.status}`);
  const body: JsonValue = await response.json();
  return parseSearchResponse(body);
}

/**
 * Builds today's digest (UTC day) once for everyone: top stories of the last
 * 24 hours by points, one model call for the "why it matters" lines. Safe to
 * call repeatedly: an existing digest is left alone and a lock stops overlap.
 * A failed run stores nothing, so a later run (the cron fires twice) retries.
 */
export async function runDigestBuild(
  deps: DigestBuildDeps
): Promise<DigestBuildSummary> {
  const { store } = deps;
  const now = deps.now ?? Date.now;
  const doFetch = deps.fetch ?? fetch;
  const date = utcDate(now());

  if (await readDigest(store, date)) return { status: "exists", date };
  if (!deps.llm) return { status: "no_llm", date };

  const budget =
    deps.dailyTokenBudget ??
    parseBudget(process.env.SUMMARY_DAILY_TOKEN_BUDGET);
  if (!(await withinDailyBudget(store, budget, now()))) {
    return { status: "over_budget", date };
  }

  if (!(await store.setIfAbsent(digestLockKey(date), 1, BUILD_LOCK_SECONDS))) {
    return { status: "locked", date };
  }
  try {
    // Another run may have finished between the first check and the lock.
    if (await readDigest(store, date)) return { status: "exists", date };

    const stories = selectTopStories(await fetchCandidates(doFetch, now()));
    if (stories.length < MIN_STORIES) return { status: "no_stories", date };

    const model =
      deps.model ?? process.env.SUMMARY_MODEL ?? DEFAULT_SUMMARY_MODEL;
    const result = await deps.llm.complete({
      model,
      system: DIGEST_SYSTEM_PROMPT,
      user: buildDigestInput(stories),
      maxTokens: DIGEST_MAX_TOKENS,
      schema: DIGEST_SCHEMA,
    });
    // Billed whatever happens next, so count it before validating.
    await recordTokenUsage(store, result, now());

    const blurbs = validateBlurbs(
      parseModelJson(result),
      new Set(stories.map((story) => story.id))
    );
    if (!blurbs) throw new SummaryError("invalid_output", "No usable blurbs");

    const digest: Digest = {
      date,
      stories: stories.map((story) => ({
        id: story.id,
        title: story.title,
        url: story.url,
        domain: story.domain,
        points: story.points,
        comments: story.comments,
        blurb: blurbs.get(story.id) ?? "",
      })),
      generatedAt: new Date(now()).toISOString(),
    };
    await writeDigest(store, digest);
    return { status: "built", date, stories: digest.stories.length };
  } catch (error) {
    const reason = error instanceof SummaryError ? error.reason : "error";
    console.error(`digest ${date} failed: ${reason}`);
    return { status: "failed", date };
  } finally {
    await store.del(digestLockKey(date));
  }
}

/** `GET /api/cron/digest-build`: authorised by `CRON_SECRET`. */
export async function handleDigestBuildCron(
  req: Request,
  deps: DigestBuildDeps
): Promise<Response> {
  const auth = requireCron(req, deps.secret);
  if (!auth.ok) return auth.response;
  const summary = await runDigestBuild(deps);
  const failed = summary.status === "failed" || summary.status === "no_llm";
  return json(summary, failed ? 503 : 200);
}
