import type { Metadata } from "next";
import Link from "next/link";
import { RECIPES } from "../../../convex/lib/recipes";
import { RecipePreview } from "@/components/recipe-preview";
import { ScanCta } from "@/components/scan-cta";

export const metadata: Metadata = {
  title: "Effect recipes — hand-made, tested, anti-slop",
  description:
    "Liquid glass, frosted glass, film grain, mesh gradients and more — copy-paste CSS/JS and React code with guardrails, fallbacks and reduced-motion support. Hand them to your AI.",
  alternates: { canonical: "/recipes" },
};

const CATEGORY_LABEL: Record<string, string> = {
  surface: "Surface",
  texture: "Texture",
  motion: "Motion",
  interaction: "Interaction",
};

export default function RecipesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-4 sm:px-6">
      <p className="motion-pop inline-block rounded-full border-[3px] border-[var(--ink)] bg-[var(--accent-3)] px-3 py-1 text-xs font-extrabold uppercase tracking-wide shadow-[3px_3px_0_var(--ink)]">
        Free · copy-paste · render-tested
      </p>
      <h1
        className="motion-rise mt-4 max-w-3xl font-[family-name:var(--font-display)] text-4xl font-black leading-[1.05] tracking-tight text-[var(--ink)] sm:text-6xl"
        style={{ ["--delay" as string]: "100ms" }}
      >
        Effect recipes your AI can&apos;t fake
      </h1>
      <p
        className="motion-rise mt-4 max-w-2xl text-base font-medium text-[var(--ink)]/75 sm:text-lg"
        style={{ ["--delay" as string]: "200ms" }}
      >
        Ask an AI for &ldquo;liquid glass&rdquo; and you get a blur. These are
        hand-made: real technique, browser fallbacks, reduced-motion support and
        notes on when <em>not</em> to use them. Copy one, or let a Slopcheck
        review pick the right ones for your site.
      </p>

      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {RECIPES.map((r, i) => (
          <li
            key={r.id}
            className="motion-rise goof-hit"
            style={{ ["--delay" as string]: 250 + i * 60 + "ms" }}
          >
            <Link
              href={"/recipes/" + r.id}
              className="goof-face block overflow-hidden rounded-[1.8rem] border-[3px] border-[var(--ink)] bg-white shadow-[5px_6px_0_var(--ink)]"
            >
              <div className="border-b-[3px] border-[var(--ink)]">
                <RecipePreview recipe={r} height={200} interactive={false} />
              </div>
              <div className="p-5">
                <p className="text-xs font-black uppercase tracking-wide text-[var(--ink)]/50">
                  {CATEGORY_LABEL[r.category] ?? r.category}
                </p>
                <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-extrabold text-[var(--ink)]">
                  {r.name}
                </h2>
                <p className="mt-2 text-sm font-semibold text-[var(--ink)]/70">
                  {r.summary}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <ScanCta />
    </div>
  );
}
