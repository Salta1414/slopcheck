import { kitRecipeIds, type DesignKit } from "./kit";
import { getRecipe, type Recipe } from "./recipes";

type BriefInput = {
  url: string;
  score: number;
  tells: { label: string; evidence: string }[];
  findings: { area: string; issue: string; fixHint: string }[];
  kit: DesignKit;
};

function cssTokens(kit: DesignKit): string {
  const used = new Map<string, number>();
  const lines = kit.palette.map((p) => {
    const n = (used.get(p.role) ?? 0) + 1;
    used.set(p.role, n);
    const name = n === 1 ? p.role : p.role + "-" + n;
    return "  --color-" + name + ": " + p.hex + "; /* " + p.name + " */";
  });
  lines.push('  --font-display: "' + kit.fonts.display + '", serif;');
  lines.push('  --font-body: "' + kit.fonts.body + '", sans-serif;');
  return ":root {\n" + lines.join("\n") + "\n}";
}

/**
 * One markdown file the user pastes into Claude Code / Cursor / v0.
 * It carries the direction, tokens, plan and the full recipe code, so the
 * user's AI never has to improvise the hard parts.
 */
export function buildBriefMarkdown(input: BriefInput): string {
  const { kit } = input;
  const recipes = kitRecipeIds(kit)
    .map((id) => getRecipe(id))
    .filter((r) => r !== undefined);

  const out: string[] = [];
  out.push("# Redesign brief for " + input.url);
  out.push("");
  out.push(
    "> From Slopcheck (slop score " +
      input.score +
      "/100). Paste this whole file into your AI coding tool. Keep the site's real content and structure; change how it looks and moves.",
  );
  out.push("");
  out.push("## Instructions for the AI");
  out.push("");
  out.push("1. Read the whole brief before editing anything.");
  out.push("2. Apply the design tokens first, then work section by section.");
  out.push(
    '3. Use the recipe code below verbatim where the plan names it — do not rewrite or "simplify" it, and keep its fallbacks and reduced-motion rules.',
  );
  out.push(
    "4. Do not add gradients, glow blobs, pill badges, stat strips or glass cards the plan doesn't ask for.",
  );
  out.push("");
  out.push("## Direction");
  out.push("");
  out.push(kit.direction);
  out.push("");
  out.push("## Design tokens");
  out.push("");
  out.push(
    "Fonts: **" +
      kit.fonts.display +
      "** (display) + **" +
      kit.fonts.body +
      "** (body) from Google Fonts — " +
      kit.fonts.why,
  );
  out.push("");
  out.push("```css");
  out.push(cssTokens(kit));
  out.push("```");
  out.push("");
  if (kit.motion.length > 0) {
    out.push("## Motion rules");
    out.push("");
    for (const rule of kit.motion) out.push("- " + rule);
    out.push("");
  }
  out.push("## Section plan");
  out.push("");
  for (const s of kit.sections) {
    out.push("### " + s.section);
    out.push("");
    if (s.remove) out.push("- **Remove:** " + s.remove);
    out.push("- **Replace with:** " + s.replace);
    if (s.recipes.length > 0) {
      out.push(
        "- **Recipes:** " + s.recipes.map((id) => "`" + id + "`").join(", "),
      );
    }
    out.push("");
  }
  if (input.tells.length > 0) {
    out.push("## What makes it look AI-generated today");
    out.push("");
    for (const t of input.tells) out.push("- " + t.label + " — " + t.evidence);
    out.push("");
  }
  if (input.findings.length > 0) {
    out.push("## Findings");
    out.push("");
    for (const f of input.findings) {
      out.push("- **" + f.area + ":** " + f.issue + " → " + f.fixHint);
    }
    out.push("");
  }
  for (const r of recipes) {
    out.push(recipeMarkdown(r));
    out.push("");
  }
  return out.join("\n");
}

/** One recipe as a self-contained markdown section for an AI. */
export function recipeMarkdown(r: Recipe): string {
  const out: string[] = [];
  out.push("## Recipe: " + r.name + " (`" + r.id + "`)");
  out.push("");
  out.push(r.summary);
  out.push("");
  out.push("- **Note for the AI:** " + r.aiHint);
  out.push("- **Avoid:** " + r.avoidWhen.join("; "));
  out.push("- **Support:** " + r.support);
  out.push("");
  out.push("```html");
  out.push(r.html);
  out.push("```");
  out.push("");
  out.push("```css");
  out.push(r.css);
  out.push("```");
  out.push("");
  if (r.js) {
    out.push("```js");
    out.push(r.js);
    out.push("```");
    out.push("");
  }
  out.push("React version:");
  out.push("");
  out.push("```tsx");
  out.push(r.react);
  out.push("```");
  out.push("");
  return out.join("\n").trimEnd();
}
