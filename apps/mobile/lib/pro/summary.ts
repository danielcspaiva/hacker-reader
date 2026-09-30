/**
 * AI story summaries: the response shape of `GET /api/v1/summaries/story/:id`
 * and the small pure rules around it. No React Native imports (node tests).
 */

import {
  isJsonNumber,
  isJsonObject,
  isJsonString,
  type JsonValue,
} from "./json";

export interface SummaryTheme {
  title: string;
  summary: string;
  /** HN comment ids the theme is based on. */
  commentIds: number[];
}

export interface SummaryDisagreement {
  question: string;
  sides: string[];
}

export interface StorySummary {
  articleTldr?: string;
  discussion: {
    summary: string;
    themes: SummaryTheme[];
    disagreements?: SummaryDisagreement[];
  };
  /** ISO timestamp. */
  generatedAt: string;
  commentCountAtGeneration: number;
  model: string;
}

export type StorySummaryResult =
  | { status: "ready"; summary: StorySummary }
  | { status: "generating" };

/** The "Summarize N comments" pill in the story header shows above this. */
export const SUMMARY_PILL_MIN_COMMENTS = 40;

export function shouldOfferSummaryPill(commentCount: number | undefined) {
  return (commentCount ?? 0) > SUMMARY_PILL_MIN_COMMENTS;
}

function asText(value: JsonValue | undefined): string | undefined {
  return isJsonString(value) && value.trim() ? value : undefined;
}

function parseTheme(value: JsonValue): SummaryTheme | null {
  if (!isJsonObject(value)) return null;
  const title = asText(value.title);
  const summary = asText(value.summary);
  if (!title || !summary) return null;
  const commentIds = Array.isArray(value.commentIds)
    ? value.commentIds.filter(
        (id): id is number => isJsonNumber(id) && Number.isInteger(id)
      )
    : [];
  return { title, summary, commentIds };
}

function parseDisagreement(value: JsonValue): SummaryDisagreement | null {
  if (!isJsonObject(value) || !Array.isArray(value.sides)) return null;
  const question = asText(value.question);
  const sides = value.sides.flatMap((side) => asText(side) ?? []);
  return question && sides.length >= 2 ? { question, sides } : null;
}

/**
 * Validates an API body. Anything that is not a ready summary or a
 * "generating" marker is null; malformed themes are dropped, so a slightly
 * off response still renders.
 */
export function parseSummaryResult(body: JsonValue): StorySummaryResult | null {
  if (!isJsonObject(body)) return null;
  if (body.status === "generating") return { status: "generating" };
  if (body.status !== "ready" || !isJsonObject(body.summary)) return null;

  const { summary } = body;
  const discussion = summary.discussion;
  if (!isJsonObject(discussion)) return null;
  const discussionSummary = asText(discussion.summary);
  if (
    !discussionSummary ||
    !isJsonString(summary.generatedAt) ||
    !isJsonNumber(summary.commentCountAtGeneration)
  ) {
    return null;
  }

  const themes = Array.isArray(discussion.themes)
    ? discussion.themes.flatMap((theme) => parseTheme(theme) ?? [])
    : [];
  const disagreements = Array.isArray(discussion.disagreements)
    ? discussion.disagreements.flatMap(
        (disagreement) => parseDisagreement(disagreement) ?? []
      )
    : [];

  const parsed: StorySummary = {
    discussion: { summary: discussionSummary, themes },
    generatedAt: summary.generatedAt,
    commentCountAtGeneration: summary.commentCountAtGeneration,
    model: isJsonString(summary.model) ? summary.model : "",
  };
  const tldr = asText(summary.articleTldr);
  if (tldr) parsed.articleTldr = tldr;
  if (disagreements.length > 0) parsed.discussion.disagreements = disagreements;
  return { status: "ready", summary: parsed };
}

/** "just now", "5 min ago", "3 h ago", "2 d ago". */
export function generatedAgo(generatedAt: string, now: number): string {
  const time = Date.parse(generatedAt);
  if (Number.isNaN(time)) return "recently";
  const minutes = Math.floor((now - time) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

/** "1 comment" / "3 comments". */
export function commentsLabel(count: number): string {
  return `${count} ${count === 1 ? "comment" : "comments"}`;
}

export interface SummaryFailure {
  title: string;
  message: string;
  /** Whether "Try Again" can help right now. */
  retryable: boolean;
  /** The user is not Pro (any more): offer the paywall instead. */
  needsPro: boolean;
}

/** Friendly copy for a failed request, from the API status and error code. */
export function describeSummaryFailure(
  status: number | undefined,
  code: string | undefined
): SummaryFailure {
  if (status === 402) {
    return {
      title: "Pro required",
      message: "AI summaries are part of Hacker Reader Pro.",
      retryable: false,
      needsPro: true,
    };
  }
  const plain = (title: string, message: string, retryable: boolean) => ({
    title,
    message,
    retryable,
    needsPro: false,
  });
  switch (code) {
    case "daily_limit":
      return plain(
        "Daily limit reached",
        "You have used today's summaries. Come back tomorrow.",
        false
      );
    case "summaries_paused":
      return plain(
        "Summaries are paused",
        "AI summaries are paused for today. Please try again tomorrow.",
        false
      );
    case "not_enough_comments":
      return plain(
        "Not enough to summarise",
        "This story needs a few more comments first.",
        false
      );
    case "not_found":
    case "not_a_story":
    case "summary_refused":
      return plain(
        "Can't summarise this one",
        "This story could not be summarised.",
        false
      );
    default:
      return plain(
        "Couldn't load the summary",
        "Something went wrong. Check your connection and try again.",
        true
      );
  }
}
