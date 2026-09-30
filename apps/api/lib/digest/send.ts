import { mapLimit } from "../async";
import { requireCron } from "../cron";
import {
  DEVICE_INDEX_KEY,
  getDevice,
  pruneDeviceIndex,
  type Device,
} from "../devices";
import { getEntitlement, type EntitlementDeps } from "../entitlement";
import { json } from "../http";
import {
  checkPendingReceipts,
  chunk,
  sendPush,
  SEND_BATCH_SIZE,
  type PushMessage,
} from "../push";
import type { Store } from "../store";
import { readDigestPref } from "./prefs";
import {
  digestSentKey,
  readDigest,
  SENT_TTL_SECONDS,
  type Digest,
} from "./store";
import { inDeliveryWindow, previousUtcDate, utcDate } from "./window";

/** Stops starting new batches after this long; Vercel allows 60s. */
export const RUN_BUDGET_MS = 50_000;
const FETCH_CONCURRENCY = 6;
const LOCK_KEY = "digest:send:lock";
const LOCK_SECONDS = 120;
const TITLE_CHARS = 100;

export interface DigestSendDeps extends Partial<EntitlementDeps> {
  store: Store;
  fetch?: typeof fetch;
  now?: () => number;
  budgetMs?: number;
  secret?: string;
}

export interface DigestSendSummary {
  /** Date of the digest that was sent, or null when none exists. */
  digestDate: string | null;
  due: number;
  sent: number;
  failed: number;
  /** True when the run stopped at the time budget. */
  partial: boolean;
}

type DueDevice = Device & { expoPushToken: string };

/** Today's digest (UTC day), else yesterday's, else null. */
export async function pickDigest(
  store: Store,
  nowMs: number
): Promise<Digest | null> {
  return (
    (await readDigest(store, utcDate(nowMs))) ??
    (await readDigest(store, previousUtcDate(nowMs)))
  );
}

/** "Top story title and N more"; just the title for a one-story digest. */
export function digestBody(digest: Digest): string {
  const [top] = digest.stories;
  if (!top) return "";
  const title =
    top.title.length > TITLE_CHARS
      ? `${top.title.slice(0, TITLE_CHARS).trimEnd()}…`
      : top.title;
  const more = digest.stories.length - 1;
  return more > 0 ? `${title} and ${more} more` : title;
}

export function buildDigestMessage(to: string, digest: Digest): PushMessage {
  return {
    to,
    title: "☕ Your HN morning",
    body: digestBody(digest),
    sound: "default",
    threadId: "digest",
    data: { url: `hnclient://digest/${digest.date}`, kind: "digest" },
  };
}

/** Devices with the digest on whose local time is in their delivery window. */
async function devicesInWindow(
  store: Store,
  nowMs: number
): Promise<DueDevice[]> {
  await pruneDeviceIndex(store);
  const ids = await store.smembers(DEVICE_INDEX_KEY);
  const devices = await mapLimit(ids, FETCH_CONCURRENCY, (id) =>
    getDevice(store, id)
  );
  return devices.filter((device): device is DueDevice => {
    if (!device?.expoPushToken) return false;
    const pref = readDigestPref(device.prefs);
    return pref !== null && inDeliveryWindow(nowMs, device.timezone, pref.hour);
  });
}

/**
 * One cron run (every 15 minutes): pushes the digest to every Pro device whose
 * local time is in its chosen hour's first quarter and that has not had this
 * digest yet. The sent mark is keyed by the digest's date (2 day TTL), so a
 * fallback to yesterday's digest never repeats one already delivered and a DST
 * repeated hour cannot double-send. Stops at the time budget; a lock keeps
 * overlapping runs from double-sending.
 */
export async function runDigestSend(
  deps: DigestSendDeps
): Promise<DigestSendSummary> {
  const { store } = deps;
  const now = deps.now ?? Date.now;
  const started = now();
  const budget = deps.budgetMs ?? RUN_BUDGET_MS;
  const summary: DigestSendSummary = {
    digestDate: null,
    due: 0,
    sent: 0,
    failed: 0,
    partial: false,
  };

  if ((await store.incr(LOCK_KEY, LOCK_SECONDS)) > 1) return summary;
  try {
    const digest = await pickDigest(store, started);
    if (!digest || digest.stories.length === 0) return summary;
    summary.digestDate = digest.date;

    const inWindow = await devicesInWindow(store, started);
    const pending = (
      await mapLimit(inWindow, FETCH_CONCURRENCY, async (device) =>
        (await store.get(digestSentKey(device.installId, digest.date))) === null
          ? device
          : null
      )
    ).filter((device): device is DueDevice => device !== null);

    // Pro last: it can cost a RevenueCat lookup when the cache is cold.
    const due: DueDevice[] = [];
    for (const device of pending) {
      if (now() - started >= budget) {
        summary.partial = true;
        break;
      }
      try {
        const entitlement = await getEntitlement(device.installId, {
          ...deps,
          store,
        });
        if (entitlement.pro) due.push(device);
      } catch {
        // Fails closed, like requirePro.
      }
    }
    summary.due = due.length;

    for (const batch of chunk(due, SEND_BATCH_SIZE)) {
      if (now() - started >= budget) {
        summary.partial = true;
        break;
      }
      const result = await sendPush(
        batch.map((device) => buildDigestMessage(device.expoPushToken, digest)),
        deps
      );
      summary.sent += result.sent;
      summary.failed += result.failed;
      // Nothing got through and no token was dropped: leave them unmarked so
      // the next run (if still in the window) retries.
      if (
        result.sent === 0 &&
        result.failed > 0 &&
        result.removedTokens === 0
      ) {
        continue;
      }
      await mapLimit(batch, FETCH_CONCURRENCY, (device) =>
        store.set(digestSentKey(device.installId, digest.date), 1, {
          ttlSeconds: SENT_TTL_SECONDS,
        })
      );
    }
    await checkPendingReceipts(deps);
  } finally {
    await store.del(LOCK_KEY);
  }
  return summary;
}

/** `GET /api/cron/digest-send`: authorised by `CRON_SECRET`. */
export async function handleDigestSendCron(
  req: Request,
  deps: DigestSendDeps
): Promise<Response> {
  const auth = requireCron(req, deps.secret);
  if (!auth.ok) return auth.response;
  return json(await runDigestSend(deps));
}
