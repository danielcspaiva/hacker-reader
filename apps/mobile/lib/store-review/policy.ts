/**
 * When to ask for an App Store rating. Pure: no RN imports, tested in Node.
 *
 * Ask only engaged readers, on their way out of a story, at most once per
 * app version and never twice within MIN_DAYS_BETWEEN_PROMPTS. iOS also caps
 * the system prompt at three per year and may show nothing at all.
 */

export const MIN_STORIES_READ = 10;
export const MIN_DAYS_SINCE_FIRST_READ = 3;
export const MIN_DAYS_BETWEEN_PROMPTS = 120;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReviewPromptState {
  storiesRead: number;
  firstReadAt: number;
  lastPromptAt: number | null;
  lastPromptVersion: string | null;
}

export function isReviewPromptState(
  value: unknown
): value is ReviewPromptState {
  if (typeof value !== "object" || value === null) return false;
  if (
    !("storiesRead" in value) ||
    !("firstReadAt" in value) ||
    !("lastPromptAt" in value) ||
    !("lastPromptVersion" in value)
  ) {
    return false;
  }
  return (
    typeof value.storiesRead === "number" &&
    typeof value.firstReadAt === "number" &&
    (value.lastPromptAt === null || typeof value.lastPromptAt === "number") &&
    (value.lastPromptVersion === null ||
      typeof value.lastPromptVersion === "string")
  );
}

export function withStoryRead(
  state: ReviewPromptState | null,
  now: number
): ReviewPromptState {
  if (!state) {
    return {
      storiesRead: 1,
      firstReadAt: now,
      lastPromptAt: null,
      lastPromptVersion: null,
    };
  }
  return { ...state, storiesRead: state.storiesRead + 1 };
}

export function shouldPromptForReview(
  state: ReviewPromptState | null,
  now: number,
  appVersion: string
): boolean {
  if (!state) return false;
  if (state.storiesRead < MIN_STORIES_READ) return false;
  if (now - state.firstReadAt < MIN_DAYS_SINCE_FIRST_READ * DAY_MS) {
    return false;
  }
  if (state.lastPromptVersion === appVersion) return false;
  if (
    state.lastPromptAt !== null &&
    now - state.lastPromptAt < MIN_DAYS_BETWEEN_PROMPTS * DAY_MS
  ) {
    return false;
  }
  return true;
}

export function withPrompt(
  state: ReviewPromptState,
  now: number,
  appVersion: string
): ReviewPromptState {
  return { ...state, lastPromptAt: now, lastPromptVersion: appVersion };
}
