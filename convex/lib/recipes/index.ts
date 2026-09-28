import { frostedGlass } from "./frostedGlass";
import { grainOverlay } from "./grainOverlay";
import { liquidGlass } from "./liquidGlass";
import { magneticButton } from "./magneticButton";
import { marquee } from "./marquee";
import { meshGradient } from "./meshGradient";
import { textReveal } from "./textReveal";
import { tiltCard } from "./tiltCard";
import type { Recipe } from "./types";

export type { Recipe } from "./types";

/** Hand-made and render-tested. Add new recipes here. */
export const RECIPES: Recipe[] = [
  liquidGlass,
  frostedGlass,
  grainOverlay,
  meshGradient,
  textReveal,
  tiltCard,
  magneticButton,
  marquee,
];

/** Full standalone preview page for a recipe (demo staging + recipe code). */
export function recipePreviewHtml(recipe: Recipe): string {
  return (
    '<!doctype html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    "<style>" +
    recipe.demo.css +
    "\n" +
    recipe.css +
    "</style></head><body>" +
    recipe.demo.html +
    (recipe.js ? "<script>" + recipe.js + "</script>" : "") +
    "</body></html>"
  );
}

const BY_ID = new Map(RECIPES.map((r) => [r.id, r]));

export function getRecipe(id: string): Recipe | undefined {
  return BY_ID.get(id);
}

/** What the review model sees: ids, purpose and guardrails — never code. */
export function recipeCatalogForPrompt(): string {
  return RECIPES.map(
    (r) =>
      `- ${r.id}: ${r.summary} Use when: ${r.useWhen.join("; ")}. Avoid: ${r.avoidWhen.join("; ")}.`,
  ).join("\n");
}
