/** Where a tapped push notification leads. Pure, so it is unit-tested in node. */

export interface NotificationTarget {
  /** What sent it ("reply"); "other" for kinds this app version does not know. */
  kind: string;
  storyId: number;
  commentId?: number;
}

const STORY_URL = /^hnclient:\/\/story\/(\d{1,12})(?:\?(.*))?$/;
const KIND = /^[a-z_]{1,30}$/;

interface NotificationData {
  url: string;
  kind?: unknown;
}

function isNotificationData(value: unknown): value is NotificationData {
  return (
    typeof value === "object" &&
    value !== null &&
    "url" in value &&
    typeof value.url === "string"
  );
}

function isKind(value: unknown): value is string {
  return typeof value === "string" && KIND.test(value);
}

/**
 * Reads `data` of a notification sent by `apps/api`: `url`
 * (`hnclient://story/{id}?commentId={id}`) and `kind`. Null when there is no
 * story link to open.
 */
export function parseNotificationTarget(
  data: unknown
): NotificationTarget | null {
  if (!isNotificationData(data)) return null;

  const match = STORY_URL.exec(data.url);
  if (!match) return null;

  const target: NotificationTarget = {
    kind: isKind(data.kind) ? data.kind : "other",
    storyId: Number(match[1]),
  };
  const commentId = new URLSearchParams(match[2] ?? "").get("commentId");
  if (commentId && /^\d{1,12}$/.test(commentId)) {
    target.commentId = Number(commentId);
  }
  return target;
}
