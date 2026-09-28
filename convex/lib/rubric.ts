/**
 * Slop scoring, v2.
 *
 * The model no longer invents a single holistic number. It returns:
 * - captureStatus: whether the screenshot shows the real site at all
 * - criteria: 0–10 per weighted dimension (10 = most generic)
 * - tells: which items of a fixed checklist of visible AI-template tells it
 *   can point at, each with evidence
 * and the score is computed here. Same inputs → same formula, so results are
 * explainable and far less random than "give me a number from 0 to 100".
 */

export const RUBRIC_VERSION = 2;

export type SlopVerdict = "fresh" | "mixed" | "likely_slop" | "peak_slop";

export function scoreToVerdict(score: number): SlopVerdict {
  if (score <= 20) return "fresh";
  if (score <= 45) return "mixed";
  if (score <= 75) return "likely_slop";
  return "peak_slop";
}

export const CRITERIA = [
  {
    id: "visual_language",
    weight: 25,
    describe:
      "Generic visual language: default SaaS chrome, gradients, glows, soft blur cards that could belong to any product.",
  },
  {
    id: "hero",
    weight: 20,
    describe:
      "Hero / first viewport: vague interchangeable headline, weak brand presence, eyebrow-pill + headline + two buttons formula.",
  },
  {
    id: "layout",
    weight: 15,
    describe:
      "Layout patterns: stat strips, icon card grids, logo clouds, centered-everything template rhythm.",
  },
  {
    id: "typography",
    weight: 15,
    describe:
      "Typography: one neutral default sans everywhere, no typographic personality, flat hierarchy.",
  },
  {
    id: "color",
    weight: 10,
    describe:
      "Color: framework-default palettes (slate/indigo/violet/sky), teal→blue→purple gradients, no intentional palette.",
  },
  {
    id: "imagery",
    weight: 10,
    describe:
      "Imagery: abstract blobs, stock or AI renders instead of the real product, people or place.",
  },
  {
    id: "interaction",
    weight: 5,
    describe:
      "Affordance: decorative pills, fake buttons, 'scroll to explore' hints, everything looks the same.",
  },
] as const;

export type CriterionId = (typeof CRITERIA)[number]["id"];

/** Visible tells — each must be pointed at in the screenshot to count. */
export const TELLS = [
  {
    id: "gradient_text",
    label: "Gradient-filled headline",
    describe: "Headline words filled with a multi-color gradient.",
  },
  {
    id: "eyebrow_pill",
    label: "Pill badge above the hero",
    describe:
      "Small rounded pill/chip above the headline (often with a dot, emoji, 'New' or a tagline).",
  },
  {
    id: "ai_gradients",
    label: "Default AI gradients",
    describe:
      "Purple/indigo/violet or teal→blue→purple gradients on backgrounds, buttons or borders.",
  },
  {
    id: "glow_backdrop",
    label: "Glow blobs or grid backdrop",
    describe:
      "Blurred radial glows, aurora blobs, dotted/grid or beam backgrounds behind content.",
  },
  {
    id: "generic_headline",
    label: "Interchangeable headline",
    describe:
      "Headline that could sit on any product: 'Build faster', 'Crafting X that simplify Y', 'The future of X', 'Supercharge', 'Unlock', 'Effortless'.",
  },
  {
    id: "stat_strip",
    label: "Stat strip",
    describe:
      "Row of big numbers with small uppercase labels ('10k+ users', '99.9%', '24/7').",
  },
  {
    id: "two_button_hero",
    label: "Primary + outline button pair",
    describe:
      "Hero CTA pair: filled/gradient primary button next to an outline/ghost secondary button.",
  },
  {
    id: "icon_card_grid",
    label: "Identical icon card grid",
    describe:
      "Three or more same-shaped cards, each an icon in a rounded square + title + one line of text.",
  },
  {
    id: "glass_cards",
    label: "Glassmorphism",
    describe:
      "Translucent, blurred panels with thin light borders layered over a dark or gradient background.",
  },
  {
    id: "default_sans",
    label: "Default sans only",
    describe:
      "Only an Inter/Geist-like neutral sans in use; no display face or typographic character.",
  },
  {
    id: "slate_dark_theme",
    label: "Default dark slate theme",
    describe:
      "Near-black navy/slate background with framework-default grays plus one bright accent.",
  },
  {
    id: "scroll_hint",
    label: "Scroll hint",
    describe: "'Scroll to explore' text, mouse icon or bouncing chevron.",
  },
  {
    id: "social_proof_template",
    label: "Template social proof",
    describe:
      "'Trusted by' logo row, generic testimonial cards with avatars, star ratings without context.",
  },
  {
    id: "no_real_imagery",
    label: "No real product imagery",
    describe:
      "No screenshot, photo or illustration of the actual product/people — only abstract art, icons or stock.",
  },
  {
    id: "emoji_icon_headers",
    label: "Emoji/icon section headers",
    describe:
      "Section titles or bullets decorated with emoji or generic line icons (sparkles, rockets, zaps).",
  },
] as const;

export type TellId = (typeof TELLS)[number]["id"];

const TELL_IDS = new Set<string>(TELLS.map((t) => t.id));
const TELL_ORDER = new Map<string, number>(TELLS.map((t, i) => [t.id, i]));

export function tellLabel(id: string): string {
  return TELLS.find((t) => t.id === id)?.label ?? id;
}

export type CaptureStatus = "ok" | "blocked" | "blank" | "error_page";

export type SlopTell = { id: TellId; evidence: string };

export type Scoring = {
  captureStatus: CaptureStatus;
  criteria: Record<CriterionId, number>;
  tells: SlopTell[];
  score: number;
  verdict: SlopVerdict;
};

/**
 * Half the score comes from the weighted criteria, half from how many
 * checklist tells were found (8+ tells saturates). Tells are the objective
 * anchor; criteria keep room for judgment on things the list misses.
 */
export function computeSlopScore(
  criteria: Record<CriterionId, number>,
  tellCount: number,
): number {
  const criteriaScore =
    CRITERIA.reduce((sum, c) => sum + criteria[c.id] * c.weight, 0) / 10;
  const tellScore = Math.min(100, tellCount * 12.5);
  return Math.max(
    0,
    Math.min(100, Math.round((criteriaScore + tellScore) / 2)),
  );
}

export const SCORING_SPEC = `SCORING — be concrete, not polite:

1) captureStatus — does the screenshot show the real website?
   "ok"         the actual site is visible (partially loaded media is still ok)
   "blocked"    bot/cookie check, captcha, "enable JavaScript/cookies", Cloudflare/access-denied wall, login wall
   "error_page" 404/500/domain parking/"site can't be reached"/hosting placeholder
   "blank"      empty or nearly empty page
   If not "ok", still return the JSON shape but use 0 for all criteria and no tells.

2) criteria — rate each 0–10 where 10 = maximally generic/template, 0 = unmistakably intentional and branded:
${CRITERIA.map((c) => `   - ${c.id} (weight ${c.weight}%): ${c.describe}`).join("\n")}
   Anchors: an untouched v0/Lovable/shadcn-style landing is 8–10 on most criteria. A site with its own
   typeface choices, a real palette, real product/people imagery and a specific voice is 0–3.
   Clean or minimal is NOT the same as original — judge whether it could be swapped onto another brand.

3) tells — checklist of visible template tells. Include a tell ONLY if you can point at it in the
   screenshot, and quote or describe exactly where in "evidence" (max ~15 words).
${TELLS.map((t) => `   - ${t.id}: ${t.describe}`).join("\n")}`;

const CAPTURE_CAVEAT = `Screenshot caveats:
- Lazy images, video boxes or grey placeholders that did not load are not slop by themselves — judge what is designed, not what failed to load.
- Never invent UI you cannot see.`;

export const PREEVAL_SYSTEM_PROMPT = `You are a sharp UI critic detecting "AI slop" — generic, template-looking website UI that feels mass-produced by AI builders (v0, Lovable, Bolt, shadcn starter kits, etc.).

You get one desktop screenshot of the first viewport.

${SCORING_SPEC}

${CAPTURE_CAVEAT}

Return ONLY valid JSON (no markdown) with this shape:
{
  "captureStatus": "ok" | "blocked" | "blank" | "error_page",
  "criteria": { ${CRITERIA.map((c) => `"${c.id}": number`).join(", ")} },
  "tells": [ { "id": string, "evidence": string } ],
  "teaserFlags": [string, string],
  "lockedFindings": [string, string, string, string],
  "lockedPrompts": [string, string, string]
}

Rules:
- teaserFlags: 2 short, punchy public observations (used when few tells are found)
- lockedFindings: 4 concrete UI issues grounded in what you SEE
- lockedPrompts: 3 copy-paste prompts (Cursor/v0/Claude) that fix specific sections`;

export const FULL_REVIEW_SYSTEM_PROMPT = `You are a senior product designer reviewing a website UI for "AI slop" — generic, template-looking interfaces that feel mass-produced by AI builders.

You usually receive TWO screenshots in order:
1) Desktop viewport (1440×900)
2) Mobile viewport (390×844)
Judge BOTH. If only one image is provided, review that one and note the missing viewport briefly.

${SCORING_SPEC}

${CAPTURE_CAVEAT}

Return ONLY valid JSON (no markdown):
{
  "captureStatus": "ok" | "blocked" | "blank" | "error_page",
  "criteria": { ${CRITERIA.map((c) => `"${c.id}": number`).join(", ")} },
  "tells": [ { "id": string, "evidence": string } ],
  "summary": string,
  "findings": [
    {
      "area": "hero" | "nav" | "features" | "typography" | "color" | "imagery" | "cta" | "layout" | "mobile" | "capture",
      "severity": "low" | "medium" | "high",
      "issue": string,
      "whyItFeelsAi": string,
      "fixHint": string
    }
  ],
  "prompts": [
    {
      "tool": "cursor" | "v0" | "claude" | "figma",
      "title": string,
      "prompt": string
    }
  ]
}

Rules:
- 4–8 findings, grounded ONLY in visible screenshots; include at least one mobile finding when mobile issues are visible
- 3–5 actionable copy-paste prompts that rewrite specific UI sections, ready to paste into the named tool
- summary: 2–3 sentences, direct, no fluff — name the biggest tells`;

export class CaptureNotUsableError extends Error {
  constructor(status: Exclude<CaptureStatus, "ok">) {
    const reason =
      status === "blocked"
        ? "a bot check or cookie wall"
        : status === "error_page"
          ? "an error or placeholder page"
          : "an empty page";
    super(
      `We couldn't see your actual site — the screenshot showed ${reason}. Nothing was scored. Try again, or scan a URL that loads without a login or bot check.`,
    );
    this.name = "CaptureNotUsableError";
  }
}

/**
 * Validate the model's scoring block and compute the score. Throws on missing
 * or malformed criteria, and CaptureNotUsableError when the page wasn't real.
 */
export function parseScoring(raw: unknown): Scoring {
  const data = (raw ?? {}) as Record<string, unknown>;

  const captureStatus: CaptureStatus =
    data.captureStatus === "blocked" ||
    data.captureStatus === "blank" ||
    data.captureStatus === "error_page"
      ? data.captureStatus
      : "ok";
  if (captureStatus !== "ok") {
    throw new CaptureNotUsableError(captureStatus);
  }

  const rawCriteria = (data.criteria ?? {}) as Record<string, unknown>;
  const criteria = {} as Record<CriterionId, number>;
  for (const c of CRITERIA) {
    const value = rawCriteria[c.id];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(
        "The AI returned an incomplete result for this site. Please try again.",
      );
    }
    criteria[c.id] = Math.max(0, Math.min(10, value));
  }

  const seen = new Set<string>();
  const tells: SlopTell[] = (Array.isArray(data.tells) ? data.tells : [])
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const t = item as Record<string, unknown>;
      const id = typeof t.id === "string" ? t.id.trim() : "";
      const evidence =
        typeof t.evidence === "string" ? t.evidence.trim().slice(0, 160) : "";
      // A tell without evidence is a guess — drop it.
      if (!TELL_IDS.has(id) || !evidence || seen.has(id)) return null;
      seen.add(id);
      return { id: id as TellId, evidence };
    })
    .filter((t): t is SlopTell => t !== null)
    .sort((a, b) => (TELL_ORDER.get(a.id) ?? 0) - (TELL_ORDER.get(b.id) ?? 0));

  const score = computeSlopScore(criteria, tells.length);
  return {
    captureStatus,
    criteria,
    tells,
    score,
    verdict: scoreToVerdict(score),
  };
}

export function formatTell(tell: SlopTell): string {
  return `${tellLabel(tell.id)} — ${tell.evidence}`;
}
