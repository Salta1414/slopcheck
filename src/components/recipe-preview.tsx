import { recipePreviewHtml, type Recipe } from "../../convex/lib/recipes";

/**
 * Live recipe demo in a sandboxed iframe: scripts run, but the frame has no
 * same-origin access to slopcheck.dev.
 */
export function RecipePreview({
  recipe,
  height = 380,
  interactive = true,
}: {
  recipe: Recipe;
  height?: number;
  interactive?: boolean;
}) {
  return (
    <iframe
      title={recipe.name + " live demo"}
      srcDoc={recipePreviewHtml(recipe)}
      sandbox="allow-scripts"
      loading="lazy"
      className="block w-full border-0 bg-white"
      style={{ height, pointerEvents: interactive ? "auto" : "none" }}
    />
  );
}
