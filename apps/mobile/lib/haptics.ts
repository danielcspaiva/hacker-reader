import * as Haptics from "expo-haptics";

/**
 * Lightweight, fire-and-forget haptics helpers.
 *
 * Gated to iOS — the skill guidance is to "use expo-haptics conditionally on
 * iOS to make more delightful experiences." Callers never need to await or
 * try/catch: failures (e.g. unsupported hardware) are swallowed so a missing
 * taptic engine can never break an interaction.
 */
const isIOS = process.env.EXPO_OS === "ios";

/** Light tick for selection changes (filter switch, collapse, opening input). */
export const hapticSelection = () => {
  if (isIOS) Haptics.selectionAsync().catch(() => {});
};

/** Physical tap for committed actions (vote, share, send, destructive confirm). */
export const hapticImpact = (
  style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light
) => {
  if (isIOS) Haptics.impactAsync(style).catch(() => {});
};

/** Success / warning / error feedback for action results. */
export const hapticNotify = (type: Haptics.NotificationFeedbackType) => {
  if (isIOS) Haptics.notificationAsync(type).catch(() => {});
};

export { Haptics };
