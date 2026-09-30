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
import { isJsonObject, isFiniteNumber, type JsonValue } from "./json";
import { checkPendingReceipts, sendPush, type PushMessage } from "./push";
import {
  buildReplyMessages,
  collectReplyIds,
  individualCount,
  diffReplies,
  MAX_PARENT_WALK,
  MAX_REPLIES_FETCHED,
  notifiableReplies,
  parseHnItem,
  SUBMISSIONS_LIMIT,
  type HnItem,
  type Reply,
} from "./replies";
import type { Store } from "./store";

const FIREBASE_URL = "https://hacker-news.firebaseio.com/v0";
const ALGOLIA_URL = "https://hn.algolia.com/api/v1";

/** Stops starting new batches after this long; Vercel allows 60s. */
export const RUN_BUDGET_MS = 50_000;
export const USERS_PER_BATCH = 10;
const FETCH_CONCURRENCY = 6;
const FETCH_TIMEOUT_MS = 8_000;

const CURSOR_KEY = "replies:cursor";
const LOCK_KEY = "replies:lock";
const LOCK_SECONDS = 120;
const CURSOR_TTL = { ttlSeconds: 60 * 60 };
/**
 * The per-user mark lives 3 days and is refreshed on every run. A user who
 * switched replies off for longer starts from a fresh baseline instead of
 * receiving stale replies.
 */
const STATE_TTL = { ttlSeconds: 3 * 24 * 60 * 60 };

export const stateKey = (username: string) =>
  `replies:${username.toLowerCase()}`;

export interface RepliesDeps extends Partial<EntitlementDeps> {
  store: Store;
  fetch?: typeof fetch;
  now?: () => number;
  budgetMs?: number;
  usersPerBatch?: number;
  secret?: string;
}

export interface RepliesSummary {
  users: number;
  baselines: number;
  replies: number;
  sent: number;
  failed: number;
  errors: number;
  /** True when the run stopped at the time budget and left a cursor. */
  partial: boolean;
}

interface HnClient {
  item(id: number): Promise<HnItem | null>;
  submitted(username: string): Promise<number[] | null>;
  algoliaStoryId(id: number): Promise<number | undefined>;
}

function createHnClient(doFetch: typeof fetch): HnClient {
  const get = async (url: string): Promise<JsonValue> => {
    const response = await doFetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`${url} responded ${response.status}`);
    return response.json();
  };
  return {
    // Firebase answers null for a missing item; a failed request throws.
    item: async (id) =>
      parseHnItem(await get(`${FIREBASE_URL}/item/${id}.json`)),
    submitted: async (username) => {
      const user = await get(
        `${FIREBASE_URL}/user/${encodeURIComponent(username)}.json`
      );
      if (!isJsonObject(user)) return null;
      const ids = user.submitted;
      return Array.isArray(ids) ? ids.filter(isFiniteNumber) : [];
    },
    algoliaStoryId: async (id) => {
      const body = await get(`${ALGOLIA_URL}/items/${id}`);
      return isJsonObject(body) && isFiniteNumber(body.story_id)
        ? body.story_id
        : undefined;
    },
  };
}

/**
 * The story a comment belongs to: Algolia's `story_id`, else a capped walk up
 * the parents. `known` holds items already fetched. Undefined when unresolved.
 */
export async function resolveStoryId(
  commentId: number,
  hn: Pick<HnClient, "item" | "algoliaStoryId">,
  known: Map<number, HnItem>
): Promise<number | undefined> {
  try {
    const storyId = await hn.algoliaStoryId(commentId);
    if (storyId !== undefined) return storyId;
  } catch {
    // Fall back to walking the parents.
  }
  let current: number | undefined = commentId;
  for (let step = 0; step < MAX_PARENT_WALK && current !== undefined; step++) {
    let item: HnItem | null | undefined = known.get(current);
    if (!item) {
      item = await hn.item(current);
      if (item) known.set(current, item);
    }
    if (!item) return undefined;
    if (item.type !== "comment") return item.id;
    current = item.parent;
  }
  return undefined;
}

interface UserOutcome {
  baseline: boolean;
  replies: number;
  sent: number;
  failed: number;
  error: boolean;
}

interface UserGroup {
  username: string;
  tokens: string[];
}

async function processUser(
  group: UserGroup,
  hn: HnClient,
  deps: RepliesDeps
): Promise<UserOutcome> {
  const { store } = deps;
  const outcome: UserOutcome = {
    baseline: false,
    replies: 0,
    sent: 0,
    failed: 0,
    error: false,
  };
  try {
    const ids = await hn.submitted(group.username);
    if (ids === null) return outcome;

    const submissions = (
      await mapLimit(ids.slice(0, SUBMISSIONS_LIMIT), FETCH_CONCURRENCY, (id) =>
        hn.item(id)
      )
    ).filter((item): item is HnItem => item !== null);
    const parents = new Map(submissions.map((item) => [item.id, item]));

    const key = stateKey(group.username);
    const stored = await store.get<number>(key);
    const diff = diffReplies(collectReplyIds(submissions), stored);

    if (diff.isBaseline) {
      outcome.baseline = true;
      await store.set(key, diff.highest, STATE_TTL);
      return outcome;
    }

    const fetched = await mapLimit(
      diff.fresh.slice(0, MAX_REPLIES_FETCHED),
      FETCH_CONCURRENCY,
      (id) => hn.item(id)
    );
    const fresh = notifiableReplies(fetched, group.username);
    // Replies beyond the fetch cap count towards "and N more".
    const unfetched = Math.max(0, diff.fresh.length - MAX_REPLIES_FETCHED);
    outcome.replies = fresh.length + unfetched;

    const storyIds = new Map<number, number | undefined>();
    const replies: Reply[] = [];
    // Only the replies that get their own push need a story id.
    const individual = individualCount(outcome.replies);
    for (const [index, item] of fresh.entries()) {
      const reply: Reply = {
        id: item.id,
        by: item.by ?? "",
        text: item.text ?? "",
      };
      const parentId = item.parent;
      if (index < individual && parentId !== undefined) {
        if (!storyIds.has(parentId)) {
          const parent = parents.get(parentId);
          storyIds.set(
            parentId,
            parent && parent.type !== "comment"
              ? parent.id
              : await resolveStoryId(parentId, hn, parents)
          );
        }
        const storyId = storyIds.get(parentId);
        if (storyId !== undefined) reply.storyId = storyId;
      }
      replies.push(reply);
    }

    const messages = buildReplyMessages(replies, unfetched);
    const pushes: PushMessage[] = group.tokens.flatMap((to) =>
      messages.map((message) => {
        const push: PushMessage = {
          to,
          title: message.title,
          body: message.body,
          sound: "default",
          threadId: "replies",
          data: { kind: "reply" },
        };
        if (message.url && push.data) push.data.url = message.url;
        return push;
      })
    );

    if (pushes.length > 0) {
      const result = await sendPush(pushes, deps);
      outcome.sent = result.sent;
      outcome.failed = result.failed;
      // Nothing got through and no token was dropped: retry next run.
      if (
        result.sent === 0 &&
        result.failed > 0 &&
        result.removedTokens === 0
      ) {
        outcome.error = true;
        return outcome;
      }
    }
    await store.set(key, diff.highest, STATE_TTL);
  } catch {
    outcome.error = true;
  }
  return outcome;
}

/** Users with reply notifications on, sorted by name, with their push tokens. */
async function eligibleUsers(deps: RepliesDeps): Promise<UserGroup[]> {
  const { store } = deps;
  await pruneDeviceIndex(store);
  const ids = await store.smembers(DEVICE_INDEX_KEY);
  const devices = (
    await mapLimit(ids, FETCH_CONCURRENCY, (id) => getDevice(store, id))
  ).filter(
    (
      device
    ): device is Device & { hnUsername: string; expoPushToken: string } =>
      device !== null &&
      device.prefs.replies === true &&
      !!device.hnUsername &&
      !!device.expoPushToken
  );

  const groups = new Map<string, UserGroup>();
  const proChecked = new Map<string, boolean>();
  for (const device of devices) {
    let isPro = proChecked.get(device.installId);
    if (isPro === undefined) {
      try {
        isPro = (await getEntitlement(device.installId, { ...deps, store }))
          .pro;
      } catch {
        isPro = false; // fails closed, like requirePro
      }
      proChecked.set(device.installId, isPro);
    }
    if (!isPro) continue;

    const name = device.hnUsername.toLowerCase();
    const group = groups.get(name) ?? {
      username: device.hnUsername,
      tokens: [],
    };
    if (!group.tokens.includes(device.expoPushToken)) {
      group.tokens.push(device.expoPushToken);
    }
    groups.set(name, group);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, group]) => group);
}

/**
 * One cron run: walks the users after the stored cursor in batches until the
 * time budget is used up, then stores a cursor (or clears it after the last
 * user). A short lock keeps overlapping runs from double-sending.
 */
export async function runReplies(deps: RepliesDeps): Promise<RepliesSummary> {
  const { store } = deps;
  const now = deps.now ?? Date.now;
  const started = now();
  const budget = deps.budgetMs ?? RUN_BUDGET_MS;
  const batchSize = deps.usersPerBatch ?? USERS_PER_BATCH;
  const summary: RepliesSummary = {
    users: 0,
    baselines: 0,
    replies: 0,
    sent: 0,
    failed: 0,
    errors: 0,
    partial: false,
  };

  if ((await store.incr(LOCK_KEY, LOCK_SECONDS)) > 1) return summary;
  try {
    const hn = createHnClient(deps.fetch ?? fetch);
    const cursor = await store.get<string>(CURSOR_KEY);
    const users = (await eligibleUsers(deps)).filter(
      (group) => cursor === null || group.username.toLowerCase() > cursor
    );

    let processed = 0;
    let lastName: string | undefined;
    while (processed < users.length) {
      if (now() - started >= budget) {
        summary.partial = true;
        break;
      }
      const batch = users.slice(processed, processed + batchSize);
      const outcomes = await mapLimit(batch, FETCH_CONCURRENCY, (group) =>
        processUser(group, hn, deps)
      );
      for (const outcome of outcomes) {
        summary.users += 1;
        summary.baselines += outcome.baseline ? 1 : 0;
        summary.replies += outcome.replies;
        summary.sent += outcome.sent;
        summary.failed += outcome.failed;
        summary.errors += outcome.error ? 1 : 0;
      }
      processed += batch.length;
      lastName = batch[batch.length - 1]?.username.toLowerCase();
    }

    if (summary.partial && lastName !== undefined) {
      await store.set(CURSOR_KEY, lastName, CURSOR_TTL);
    } else {
      await store.del(CURSOR_KEY);
    }
    await checkPendingReceipts(deps);
  } finally {
    await store.del(LOCK_KEY);
  }
  return summary;
}

/** `GET /api/cron/replies`: authorised by `CRON_SECRET`, answers the run summary. */
export async function handleRepliesCron(
  req: Request,
  deps: RepliesDeps
): Promise<Response> {
  const auth = requireCron(req, deps.secret);
  if (!auth.ok) return auth.response;
  return json(await runReplies(deps));
}
