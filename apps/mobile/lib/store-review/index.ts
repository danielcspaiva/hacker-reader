/** App Store rating prompt, persisted in AsyncStorage. See `policy.ts`. */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import * as StoreReview from "expo-store-review";

import { reportError } from "@/lib/observability/report-error";

import {
  isReviewPromptState,
  type ReviewPromptState,
  shouldPromptForReview,
  withPrompt,
  withStoryRead,
} from "./policy";

const STORAGE_KEY = "store-review-prompt";

async function readState(): Promise<ReviewPromptState | null> {
  const json = await AsyncStorage.getItem(STORAGE_KEY);
  if (!json) return null;
  const parsed: unknown = JSON.parse(json);
  return isReviewPromptState(parsed) ? parsed : null;
}

async function writeState(state: ReviewPromptState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Counts an opened story towards the engagement threshold. */
export async function noteStoryRead(): Promise<void> {
  try {
    await writeState(withStoryRead(await readState(), Date.now()));
  } catch (error) {
    reportError(error, { operation: "storeReview.noteStoryRead" });
  }
}

/** Shows the system rating prompt when the policy allows it. */
export async function maybeRequestStoreReview(): Promise<void> {
  try {
    const state = await readState();
    const now = Date.now();
    const version = Application.nativeApplicationVersion ?? "unknown";
    if (!state || !shouldPromptForReview(state, now, version)) return;
    if (!(await StoreReview.hasAction())) return;
    await writeState(withPrompt(state, now, version));
    await StoreReview.requestReview();
  } catch (error) {
    reportError(error, { operation: "storeReview.request" });
  }
}
