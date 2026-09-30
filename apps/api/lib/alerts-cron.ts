import {
  fetchCandidates,
  findMatches,
  parseSent,
  planPushes,
  sentKey,
  updateSent,
  type Candidate,
} from "./alerts";
import { parseAlerts, type AlertRule, type QueryCache } from "./alerts-match";
import { mapLimit } from "./async";
import { requireCron } from "./cron";
import {
  DEVICE_INDEX_KEY,
  getDevice,
  pruneDeviceIndex,
  type Device,
} from "./devices";
import { getEntitlement, type EntitlementDeps } from "./entitlement";
import { json } from "./http";
import { checkPendingReceipts, sendPush, type PushMessage } from "./push";
import type { Store } from "./store";

/** Stops starting new batches after this long; Vercel allows 60s. */
export const RUN_BUDGET_MS = 50_000;
export const INSTALLS_PER_BATCH = 20;
const CONCURRENCY = 6;

const CURSOR_KEY = "alerts:cursor";
const LOCK_KEY = "alerts:lock";
const LOCK_SECONDS = 120;
const CURSOR_TTL = { ttlSeconds: 60 * 60 };
/** The sent list lives 3 days and is refreshed whenever it changes. */
const SENT_TTL = { ttlSeconds: 3 * 24 * 60 * 60 };

export interface AlertsDeps extends Partial<EntitlementDeps> {
  store: Store;
  fetch?: typeof fetch;
  now?: () => number;
  budgetMs?: number;
  installsPerBatch?: number;
  maxPages?: number;
  secret?: string;
}

export interface AlertsSummary {
  installs: number;
  candidates: number;
  matched: number;
  sent: number;
  failed: number;
  errors: number;
  /** True when the run stopped at the time budget and left a cursor. */
  partial: boolean;
}

interface Install {
  installId: string;
  token: string;
  rules: AlertRule[];
}

/** Pro installs with a push token and at least one alert, sorted by install id. */
async function eligibleInstalls(deps: AlertsDeps): Promise<Install[]> {
  const { store } = deps;
  await pruneDeviceIndex(store);
  const ids = await store.smembers(DEVICE_INDEX_KEY);
  const devices = (
    await mapLimit(ids, CONCURRENCY, (id) => getDevice(store, id))
  ).filter(
    (device): device is Device & { expoPushToken: string } =>
      device !== null && !!device.expoPushToken
  );

  const installs: Install[] = [];
  for (const device of devices) {
    const parsed = parseAlerts(device.prefs.alerts);
    if (!parsed.ok || parsed.value.length === 0) continue;
    let isPro = false;
    try {
      isPro = (await getEntitlement(device.installId, { ...deps, store })).pro;
    } catch {
      isPro = false; // fails closed, like requirePro
    }
    if (!isPro) continue;
    installs.push({
      installId: device.installId,
      token: device.expoPushToken,
      rules: parsed.value,
    });
  }
  return installs.sort((a, b) =>
    a.installId < b.installId ? -1 : a.installId > b.installId ? 1 : 0
  );
}

interface InstallOutcome {
  matched: number;
  sent: number;
  failed: number;
  error: boolean;
}

async function processInstall(
  install: Install,
  candidates: readonly Candidate[],
  cache: QueryCache,
  nowSeconds: number,
  deps: AlertsDeps
): Promise<InstallOutcome> {
  const outcome: InstallOutcome = {
    matched: 0,
    sent: 0,
    failed: 0,
    error: false,
  };
  const { store } = deps;
  try {
    const key = sentKey(install.installId);
    const sent = parseSent(await store.get<unknown>(key));
    const matches = findMatches(install.rules, candidates, sent, cache);
    outcome.matched = matches.length;
    if (matches.length === 0) return outcome;

    const plan = planPushes(matches);
    const pushes: PushMessage[] = plan.messages.map((message) => ({
      ...message,
      to: install.token,
    }));
    const result = await sendPush(pushes, deps);
    outcome.sent = result.sent;
    outcome.failed = result.failed;
    // Nothing got through and the token is still good: retry next run.
    if (result.sent === 0 && result.failed > 0 && result.removedTokens === 0) {
      outcome.error = true;
      return outcome;
    }
    await store.set(key, updateSent(sent, plan.covered, nowSeconds), SENT_TTL);
  } catch {
    outcome.error = true;
  }
  return outcome;
}

/**
 * One cron run. Candidate stories are fetched once for everybody, then each
 * eligible install's alerts are matched against them, in batches after a
 * stored cursor until the time budget is used up. A short lock keeps
 * overlapping runs from double-sending.
 */
export async function runAlerts(deps: AlertsDeps): Promise<AlertsSummary> {
  const { store } = deps;
  const now = deps.now ?? Date.now;
  const started = now();
  const budget = deps.budgetMs ?? RUN_BUDGET_MS;
  const batchSize = deps.installsPerBatch ?? INSTALLS_PER_BATCH;
  const summary: AlertsSummary = {
    installs: 0,
    candidates: 0,
    matched: 0,
    sent: 0,
    failed: 0,
    errors: 0,
    partial: false,
  };

  if ((await store.incr(LOCK_KEY, LOCK_SECONDS)) > 1) return summary;
  try {
    const cursor = await store.get<string>(CURSOR_KEY);
    const installs = (await eligibleInstalls(deps)).filter(
      (install) => cursor === null || install.installId > cursor
    );
    if (installs.length === 0) {
      await store.del(CURSOR_KEY);
      await checkPendingReceipts(deps);
      return summary;
    }

    // Once per run, however many installs there are.
    let candidates: Candidate[];
    try {
      const fetchOptions: Parameters<typeof fetchCandidates>[0] = {
        nowSeconds: Math.floor(now() / 1000),
      };
      if (deps.fetch) fetchOptions.fetch = deps.fetch;
      if (deps.maxPages !== undefined) fetchOptions.maxPages = deps.maxPages;
      candidates = await fetchCandidates(fetchOptions);
    } catch {
      summary.errors += 1;
      return summary;
    }
    summary.candidates = candidates.length;

    const cache: QueryCache = new Map();
    const nowSeconds = Math.floor(now() / 1000);
    let processed = 0;
    let lastId: string | undefined;
    while (processed < installs.length) {
      if (now() - started >= budget) {
        summary.partial = true;
        break;
      }
      const batch = installs.slice(processed, processed + batchSize);
      const outcomes = await mapLimit(batch, CONCURRENCY, (install) =>
        processInstall(install, candidates, cache, nowSeconds, deps)
      );
      for (const outcome of outcomes) {
        summary.installs += 1;
        summary.matched += outcome.matched;
        summary.sent += outcome.sent;
        summary.failed += outcome.failed;
        summary.errors += outcome.error ? 1 : 0;
      }
      processed += batch.length;
      lastId = batch[batch.length - 1]?.installId;
    }

    if (summary.partial && lastId !== undefined) {
      await store.set(CURSOR_KEY, lastId, CURSOR_TTL);
    } else {
      await store.del(CURSOR_KEY);
    }
    await checkPendingReceipts(deps);
  } finally {
    await store.del(LOCK_KEY);
  }
  return summary;
}

/** `GET /api/cron/alerts`: authorised by `CRON_SECRET`, answers the run summary. */
export async function handleAlertsCron(
  req: Request,
  deps: AlertsDeps
): Promise<Response> {
  const auth = requireCron(req, deps.secret);
  if (!auth.ok) return auth.response;
  return json(await runAlerts(deps));
}
