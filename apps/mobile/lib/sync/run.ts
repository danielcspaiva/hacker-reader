/**
 * Runs one iCloud sync over every collection. Runs are serialized; a failing
 * collection is reported and skipped so the others still sync.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

import { reportError } from "@/lib/observability/report-error";
import { ICloudKVModule } from "@/modules/icloud-kv";

import { SYNCED_COLLECTIONS, type CollectionId } from "./collections";
import {
  DEFAULT_DOCUMENT_BUDGET_BYTES,
  type CollectionSyncResult,
} from "./engine";
import { setLastSyncedAt } from "./settings";

export interface SyncRunResult {
  /** Collections whose local list changed because of iCloud. */
  changed: CollectionId[];
  pulled: number;
  removed: number;
  pushed: number;
  trimmed: number;
  /** Collections whose sync threw, or whose iCloud copy was unusable. */
  problems: number;
}

export interface SyncRunOptions {
  /** Shrinks the documents after iCloud reported a quota violation. */
  shrink?: boolean;
}

let queue: Promise<unknown> = Promise.resolve();

/** Resolves to null when iCloud is unavailable. */
export function runICloudSync(
  options: SyncRunOptions = {}
): Promise<SyncRunResult | null> {
  const run = queue.then(() => runOnce(options));
  queue = run.catch(() => {});
  return run;
}

async function runOnce(options: SyncRunOptions): Promise<SyncRunResult | null> {
  if (!ICloudKVModule.isAvailable()) return null;

  // Pull what iCloud has before merging, and push what we wrote afterwards.
  ICloudKVModule.synchronize();

  const budgetBytes = options.shrink
    ? DEFAULT_DOCUMENT_BUDGET_BYTES / 4
    : DEFAULT_DOCUMENT_BUDGET_BYTES;
  const result: SyncRunResult = {
    changed: [],
    pulled: 0,
    removed: 0,
    pushed: 0,
    trimmed: 0,
    problems: 0,
  };

  for (const synced of SYNCED_COLLECTIONS) {
    let outcome: CollectionSyncResult;
    try {
      outcome = await synced.run({
        cloud: ICloudKVModule,
        storage: AsyncStorage,
        now: Date.now,
        budgetBytes,
      });
    } catch (error) {
      result.problems += 1;
      reportError(error, { operation: "icloudSync", collection: synced.id });
      continue;
    }
    if (outcome.remoteProblem) {
      result.problems += 1;
      reportError(
        new Error(`iCloud sync: ${outcome.remoteProblem} remote document`),
        {
          operation: "icloudSync.remote",
          collection: synced.id,
          detail: outcome.remoteProblemDetail ?? null,
        }
      );
    }
    if (outcome.pulled > 0 || outcome.removed > 0)
      result.changed.push(synced.id);
    result.pulled += outcome.pulled;
    result.removed += outcome.removed;
    result.pushed += outcome.pushed;
    result.trimmed += outcome.trimmed;
  }

  ICloudKVModule.synchronize();
  await setLastSyncedAt(Date.now());
  return result;
}
