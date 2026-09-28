import { getRecipe, recipeCatalogForPrompt } from "./recipes";

/**
 * The design kit: direction + tokens + a per-section plan + recipe picks.
 * Users hand it to their own AI; we never generate code for their site.
 */
export type DesignKit = {
  direction: string;
  palette: { name: string; hex: string; role: string }[];
  fonts: { display: string; body: string; why: string };
  motion: string[];
  sections: {
    section: string;
    remove: string;
    replace: string;
    recipes: string[];
  }[];
};

const PALETTE_ROLES = ["background", "surface", "text", "accent", "muted"];

export const KIT_SPEC = `DESIGN KIT — the deliverable. The user will paste it into their own AI coding tool, so be specific and decisive:
- direction: 2–3 sentences. A concrete art direction for THIS brand (mood, references, what it should feel like). No generic "modern and clean".
- palette: 4–6 colors as #RRGGBB with a role (${PALETTE_ROLES.join(" | ")}). Keep the brand's recognizable color if it has one; do not default to indigo/violet/slate.
- fonts: a Google Fonts display + body pairing with a one-line why. Never Inter, Geist, Roboto, Arial or system-ui.
- motion: 2–4 short rules (what moves, how, and what must stay still).
- sections: 3–6 entries for the sections you can see (hero, nav, features, social proof, CTA…): what to remove, what to replace it with, and optional recipe ids.
- recipes: ONLY ids from this catalog, only where they truly fit. Zero is fine; more than 3 in total is usually slop again.
${recipeCatalogForPrompt()}`;

export const KIT_JSON_SHAPE = `"kit": {
    "direction": string,
    "palette": [ { "name": string, "hex": "#RRGGBB", "role": string } ],
    "fonts": { "display": string, "body": string, "why": string },
    "motion": [string],
    "sections": [ { "section": string, "remove": string, "replace": string, "recipes": [string] } ]
  }`;

function str(value: unknown, max = 400): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Validate the model's kit; throws if the core parts are missing. */
export function parseKit(raw: unknown): DesignKit {
  const data = (raw ?? {}) as Record<string, unknown>;
  const incomplete = () =>
    new Error("The AI returned an incomplete design kit");

  const direction = str(data.direction, 600);

  const palette = (Array.isArray(data.palette) ? data.palette : [])
    .map((item) => {
      const p = (item ?? {}) as Record<string, unknown>;
      const hex = str(p.hex, 7);
      if (!/^#[0-9a-f]{6}$/i.test(hex)) return null;
      const role = PALETTE_ROLES.includes(str(p.role)) ? str(p.role) : "accent";
      return { name: str(p.name, 40) || hex, hex: hex.toUpperCase(), role };
    })
    .filter((p): p is DesignKit["palette"][number] => p !== null)
    .slice(0, 6);

  const f = (data.fonts ?? {}) as Record<string, unknown>;
  const fonts = {
    display: str(f.display, 40),
    body: str(f.body, 40),
    why: str(f.why, 240),
  };

  const motion = (Array.isArray(data.motion) ? data.motion : [])
    .map((m) => str(m, 200))
    .filter(Boolean)
    .slice(0, 4);

  const sections = (Array.isArray(data.sections) ? data.sections : [])
    .map((item) => {
      const s = (item ?? {}) as Record<string, unknown>;
      const section = str(s.section, 40);
      const replace = str(s.replace, 400);
      if (!section || !replace) return null;
      const recipes = (Array.isArray(s.recipes) ? s.recipes : [])
        .map((id) => str(id, 60))
        // Unknown ids would send the user looking for code we don't have.
        .filter((id) => getRecipe(id) !== undefined);
      return {
        section,
        remove: str(s.remove, 400),
        replace,
        recipes: [...new Set(recipes)],
      };
    })
    .filter((s): s is DesignKit["sections"][number] => s !== null)
    .slice(0, 6);

  if (
    !direction ||
    palette.length < 3 ||
    !fonts.display ||
    !fonts.body ||
    sections.length === 0
  ) {
    throw incomplete();
  }
  return { direction, palette, fonts, motion, sections };
}

export function kitRecipeIds(kit: DesignKit): string[] {
  return [...new Set(kit.sections.flatMap((s) => s.recipes))];
}
