import type { JsonValue } from "../json";
import { isFiniteNumber, isJsonObject, isString } from "../json";

export interface SummaryTheme {
  title: string;
  summary: string;
  /** HN comment ids the theme is based on; all exist in the model input. */
  commentIds: number[];
}

export interface SummaryDisagreement {
  question: string;
  sides: string[];
}

export interface SummaryBody {
  articleTldr?: string;
  discussion: {
    summary: string;
    themes: SummaryTheme[];
    disagreements?: SummaryDisagreement[];
  };
}

export interface StorySummary extends SummaryBody {
  generatedAt: string;
  commentCountAtGeneration: number;
  model: string;
}

const MAX_THEMES = 8;
const MAX_CITATIONS = 6;
const MAX_DISAGREEMENTS = 4;
const MAX_SIDES = 4;

function cleanString(value: JsonValue | undefined, max: number): string | null {
  if (!isString(value)) return null;
  const text = value.trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

function parseTheme(
  value: JsonValue,
  validIds: Set<number>
): SummaryTheme | null {
  if (!isJsonObject(value)) return null;
  const title = cleanString(value.title, 120);
  const summary = cleanString(value.summary, 700);
  if (!title || !summary) return null;

  const commentIds: number[] = [];
  if (Array.isArray(value.commentIds)) {
    for (const id of value.commentIds) {
      // Ids the model invented (or mangled) are dropped, never passed on.
      if (isFiniteNumber(id) && validIds.has(id) && !commentIds.includes(id)) {
        commentIds.push(id);
      }
    }
  }
  return { title, summary, commentIds: commentIds.slice(0, MAX_CITATIONS) };
}

function parseDisagreement(value: JsonValue): SummaryDisagreement | null {
  if (!isJsonObject(value)) return null;
  const question = cleanString(value.question, 240);
  if (!question || !Array.isArray(value.sides)) return null;
  const sides = value.sides
    .map((side) => cleanString(side, 300))
    .filter((side): side is string => side !== null)
    .slice(0, MAX_SIDES);
  return sides.length >= 2 ? { question, sides } : null;
}

/**
 * Validates the model's JSON. The discussion summary is required (null when
 * it is missing); themes and disagreements that are malformed are dropped,
 * `commentIds` the input never contained are dropped, and `articleTldr` is kept
 * only when there was something to summarise.
 */
export function validateSummaryBody(
  raw: JsonValue,
  options: { validIds: Set<number>; hasSource: boolean }
): SummaryBody | null {
  if (!isJsonObject(raw) || !isJsonObject(raw.discussion)) return null;
  const summary = cleanString(raw.discussion.summary, 1500);
  if (!summary) return null;

  const themes: SummaryTheme[] = [];
  if (Array.isArray(raw.discussion.themes)) {
    for (const item of raw.discussion.themes) {
      const theme = parseTheme(item, options.validIds);
      if (theme) themes.push(theme);
      if (themes.length === MAX_THEMES) break;
    }
  }

  const discussion: SummaryBody["discussion"] = { summary, themes };
  if (Array.isArray(raw.discussion.disagreements)) {
    const disagreements: SummaryDisagreement[] = [];
    for (const item of raw.discussion.disagreements) {
      const disagreement = parseDisagreement(item);
      if (disagreement) disagreements.push(disagreement);
      if (disagreements.length === MAX_DISAGREEMENTS) break;
    }
    if (disagreements.length > 0) discussion.disagreements = disagreements;
  }

  const body: SummaryBody = { discussion };
  const tldr = options.hasSource ? cleanString(raw.articleTldr, 800) : null;
  if (tldr) body.articleTldr = tldr;
  return body;
}
