import { frostedGlass } from "./frostedGlass";
import { grainOverlay } from "./grainOverlay";
import { liquidGlass } from "./liquidGlass";
import type { Recipe } from "./types";

export type { Recipe } from "./types";

/** Hand-made and render-tested. Add new recipes here. */
export const RECIPES: Recipe[] = [liquidGlass, frostedGlass, grainOverlay];

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
