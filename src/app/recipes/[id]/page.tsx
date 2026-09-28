import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { recipeMarkdown } from "../../../../convex/lib/kitMarkdown";
import { RECIPES, getRecipe } from "../../../../convex/lib/recipes";
import { CopyForAiButton } from "@/components/copy-for-ai-button";
import { RecipeCode } from "@/components/recipe-code";
import { RecipePreview } from "@/components/recipe-preview";
import { ScanCta } from "@/components/scan-cta";

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return RECIPES.map((r) => ({ id: r.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const recipe = getRecipe((await params).id);
  if (!recipe) return {};
  return {
    title: recipe.name + " — CSS & React recipe",
    description: recipe.summary,
    alternates: { canonical: "/recipes/" + recipe.id },
  };
}

function Notes({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[1.5rem] border-[3px] border-[var(--ink)] bg-white p-5 shadow-[3px_4px_0_var(--ink)]">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-extrabold text-[var(--ink)]">
        {title}
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-semibold text-[var(--ink)]/75">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default async function RecipePage({ params }: Props) {
  const recipe = getRecipe((await params).id);
  if (!recipe) notFound();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-4 sm:px-6">
      <Link
        href="/recipes"
        className="text-sm font-extrabold text-[var(--ink)]/55 hover:text-[var(--ink)]"
      >
        ← All recipes
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="font-mono text-xs font-bold text-[var(--ink)]/50">
            {recipe.id}
          </p>
          <h1 className="motion-rise font-[family-name:var(--font-display)] text-4xl font-black leading-tight text-[var(--ink)] sm:text-5xl">
            {recipe.name}
          </h1>
          <p className="mt-2 text-base font-semibold text-[var(--ink)]/75">
            {recipe.summary}
          </p>
        </div>
        <CopyForAiButton text={recipeMarkdown(recipe)} />
      </div>

      <div
        className="motion-rise mt-8 overflow-hidden rounded-[2rem] border-[3px] border-[var(--ink)] shadow-[6px_8px_0_var(--ink)]"
        style={{ ["--delay" as string]: "120ms" }}
      >
        <RecipePreview recipe={recipe} height={420} />
      </div>
      <p className="mt-2 text-xs font-bold text-[var(--ink)]/55">
        {recipe.support}
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Notes title="Use it for" items={recipe.useWhen} />
        <Notes
          title="Don't — this is how it turns into slop"
          items={recipe.avoidWhen}
        />
        <Notes title="Accessibility" items={recipe.accessibility} />
        <Notes title="Performance" items={recipe.performance} />
      </div>

      <div className="mt-8 rounded-[2rem] border-[3px] border-[var(--ink)] bg-white p-6 shadow-[5px_6px_0_var(--ink)]">
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--ink)]">
          The code
        </h2>
        <RecipeCode recipe={recipe} />
      </div>

      <ScanCta />
    </div>
  );
}
