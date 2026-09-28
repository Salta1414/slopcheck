import {
  formatTell,
  parseScoring,
  type Scoring,
  type SlopVerdict,
} from "./rubric";

export type PreevalResult = {
  estimatedScore: number;
  verdict: SlopVerdict;
  teaserFlags: string[];
  lockedFindings: string[];
  lockedPrompts: string[];
  scoring: Scoring;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Turn the model's preeval JSON into what we store and show. The score comes
 * from the rubric formula; the teaser leads with the first concrete tells
 * because "gradient headline — 'That Simplify Life'" is more convincing (and
 * shareable) than a vague vibe. Never fill gaps with canned text.
 */
export function buildPreevalResult(raw: unknown): PreevalResult {
  const scoring = parseScoring(raw);
  const data = (raw ?? {}) as Record<string, unknown>;

  const modelTeasers = asStringArray(data.teaserFlags);
  const modelFindings = asStringArray(data.lockedFindings);
  const lockedPrompts = asStringArray(data.lockedPrompts).slice(0, 5);

  const tellLines = scoring.tells.map(formatTell);
  const teaserFlags = (
    tellLines.length > 0 ? tellLines.slice(0, 2) : modelTeasers
  ).slice(0, 3);
  const lockedFindings = [...tellLines.slice(2), ...modelFindings].slice(0, 6);

  if (
    teaserFlags.length === 0 ||
    lockedFindings.length === 0 ||
    lockedPrompts.length === 0
  ) {
    throw new Error(
      "The AI returned an incomplete result for this site. Please try again.",
    );
  }

  return {
    estimatedScore: scoring.score,
    verdict: scoring.verdict,
    teaserFlags,
    lockedFindings,
    lockedPrompts,
    scoring,
  };
}
