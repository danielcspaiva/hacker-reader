import { removePushToken } from "./devices";
import type { JsonObject } from "./json";
import type { Store } from "./store";

const SEND_URL = "https://exp.host/--/api/v2/push/send";
const RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";

/** Expo accepts at most 100 messages per send request. */
export const SEND_BATCH_SIZE = 100;
/** Receipts are kept by Expo for 24 hours. */
const TICKET_TTL_SECONDS = 24 * 60 * 60;
const RECEIPT_BATCH_SIZE = 300;
const PENDING_TICKETS_KEY = "push:tickets";

export interface PushMessage {
  /** An Expo push token. */
  to: string;
  title?: string;
  body?: string;
  data?: JsonObject;
  sound?: "default" | null;
  badge?: number;
  channelId?: string;
  threadId?: string;
}

export interface PushDeps {
  store: Store;
  fetch?: typeof fetch;
  accessToken?: string;
}

interface Ticket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface Receipt {
  status: "ok" | "error";
  message?: string;
  details?: { error?: string };
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

function headers(deps: PushDeps): Record<string, string> {
  const accessToken = deps.accessToken ?? process.env.EXPO_ACCESS_TOKEN;
  const result: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (accessToken) result.Authorization = `Bearer ${accessToken}`;
  return result;
}

const ticketKey = (id: string) => `push:ticket:${id}`;

export interface SendResult {
  sent: number;
  failed: number;
  removedTokens: number;
}

/**
 * Sends messages in batches of 100. Tickets that come back `ok` are remembered
 * so `checkPendingReceipts` can later prune tokens Expo reports as dead; an
 * immediate `DeviceNotRegistered` removes the token straight away.
 */
export async function sendPush(
  messages: readonly PushMessage[],
  deps: PushDeps
): Promise<SendResult> {
  const doFetch = deps.fetch ?? fetch;
  const result: SendResult = { sent: 0, failed: 0, removedTokens: 0 };

  for (const batch of chunk(messages, SEND_BATCH_SIZE)) {
    const response = await doFetch(SEND_URL, {
      method: "POST",
      headers: headers(deps),
      body: JSON.stringify(batch),
    });
    if (!response.ok) {
      result.failed += batch.length;
      continue;
    }
    const payload: { data?: Ticket[] } = await response.json();
    const { data } = payload;
    const tickets = Array.isArray(data) ? data : [];

    for (const [index, message] of batch.entries()) {
      const ticket = tickets[index];
      if (ticket?.status === "ok" && ticket.id) {
        result.sent += 1;
        await deps.store.set(ticketKey(ticket.id), message.to, {
          ttlSeconds: TICKET_TTL_SECONDS,
        });
        await deps.store.sadd(PENDING_TICKETS_KEY, ticket.id);
      } else {
        result.failed += 1;
        if (ticket?.details?.error === "DeviceNotRegistered") {
          await removePushToken(deps.store, message.to);
          result.removedTokens += 1;
        }
      }
    }
  }
  return result;
}

export interface ReceiptResult {
  checked: number;
  removedTokens: number;
}

/**
 * Checks the receipts of tickets sent earlier and removes the push token of
 * every `DeviceNotRegistered`. Meant for a cron run a while after sending.
 * Receipts Expo does not know yet stay pending; expired tickets are dropped.
 */
export async function checkPendingReceipts(
  deps: PushDeps
): Promise<ReceiptResult> {
  const doFetch = deps.fetch ?? fetch;
  const ids = await deps.store.smembers(PENDING_TICKETS_KEY);
  const result: ReceiptResult = { checked: 0, removedTokens: 0 };

  for (const batch of chunk(ids, RECEIPT_BATCH_SIZE)) {
    const response = await doFetch(RECEIPTS_URL, {
      method: "POST",
      headers: headers(deps),
      body: JSON.stringify({ ids: batch }),
    });
    if (!response.ok) continue;
    const payload: { data?: Record<string, Receipt> } = await response.json();
    const { data } = payload;
    const receipts = data ?? {};

    for (const id of batch) {
      const token = await deps.store.get<string>(ticketKey(id));
      const receipt = receipts[id];
      if (!token) {
        // The ticket expired: nothing left to act on.
        await deps.store.srem(PENDING_TICKETS_KEY, id);
        continue;
      }
      if (!receipt) continue;

      result.checked += 1;
      if (
        receipt.status === "error" &&
        receipt.details?.error === "DeviceNotRegistered"
      ) {
        await removePushToken(deps.store, token);
        result.removedTokens += 1;
      }
      await deps.store.del(ticketKey(id));
      await deps.store.srem(PENDING_TICKETS_KEY, id);
    }
  }
  return result;
}
