"use client";

import { useState } from "react";
import type { DesignKit } from "../../convex/lib/kit";
import { buildBriefMarkdown } from "../../convex/lib/kitMarkdown";
import { getRecipe, type Recipe } from "../../convex/lib/recipes";
import { RecipeCode } from "@/components/recipe-code";

type Props = {
  kit: DesignKit;
  url: string;
  score: number;
  tells: { label: string; evidence: string }[];
  findings: { area: string; issue: string; fixHint: string }[];
};

const card =
  "rounded-[1.5rem] border-[3px] border-[var(--ink)] bg-white p-5 shadow-[3px_4px_0_var(--ink)]";
const heading =
  "font-[family-name:var(--font-display)] text-lg font-extrabold text-[var(--ink)]";

function fontSpecimenUrl(family: string): string {
  return (
    "https://fonts.google.com/specimen/" + family.trim().replace(/\s+/g, "+")
  );
}

function fileName(url: string): string {
  try {
    return (
      "slopcheck-brief-" + new URL(url).hostname.replace(/^www\./, "") + ".md"
    );
  } catch {
    return "slopcheck-brief.md";
  }
}

export function DesignKitPanel(props: Props) {
  const { kit } = props;
  const [copied, setCopied] = useState(false);
  const recipes = [...new Set(kit.sections.flatMap((s) => s.recipes))]
    .map((id) => getRecipe(id))
    .filter((r): r is Recipe => r !== undefined);

  function brief() {
    return buildBriefMarkdown(props);
  }

  async function copyBrief() {
    await navigator.clipboard.writeText(brief());
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function downloadBrief() {
    const blob = new Blob([brief()], { type: "text/markdown" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName(props.url);
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <section
      className="motion-rise space-y-4"
      style={{ ["--delay" as string]: "80ms" }}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--ink)]">
            Your design kit
          </h2>
          <p className="mt-1 max-w-xl text-sm font-semibold text-[var(--ink)]/65">
            Hand this to your own AI (Claude Code, Cursor, v0). It carries the
            direction, tokens, a plan per section and tested effect code.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copyBrief()}
            className="squish-press rounded-full border-[3px] border-[var(--ink)] bg-[var(--accent)] px-5 py-2.5 text-sm font-black text-[var(--ink)] shadow-[3px_3px_0_var(--ink)] transition"
          >
            {copied ? "Copied ✓" : "Copy brief for your AI"}
          </button>
          <button
            type="button"
            onClick={downloadBrief}
            className="squish-press rounded-full border-[3px] border-[var(--ink)] bg-white px-5 py-2.5 text-sm font-black text-[var(--ink)] shadow-[3px_3px_0_var(--ink)] transition"
          >
            Download .md
          </button>
        </div>
      </div>

      <div className={card}>
        <h3 className={heading}>Direction</h3>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-[var(--ink)]/80">
          {kit.direction}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className={card}>
          <h3 className={heading}>Palette</h3>
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {kit.palette.map((p) => (
              <li
                key={p.hex + p.role}
                className="text-xs font-bold text-[var(--ink)]"
              >
                <span
                  className="block h-12 rounded-xl border-[3px] border-[var(--ink)]"
                  style={{ background: p.hex }}
                />
                <span className="mt-1 block">{p.name}</span>
                <span className="block font-mono text-[var(--ink)]/55">
                  {p.hex} · {p.role}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className={card}>
          <h3 className={heading}>Type</h3>
          <p className="mt-3 text-sm font-semibold text-[var(--ink)]/80">
            <a
              href={fontSpecimenUrl(kit.fonts.display)}
              target="_blank"
              rel="noreferrer"
              className="font-black text-[var(--ink)] underline decoration-[var(--accent)] decoration-[3px] underline-offset-2"
            >
              {kit.fonts.display}
            </a>{" "}
            for display ·{" "}
            <a
              href={fontSpecimenUrl(kit.fonts.body)}
              target="_blank"
              rel="noreferrer"
              className="font-black text-[var(--ink)] underline decoration-[var(--accent)] decoration-[3px] underline-offset-2"
            >
              {kit.fonts.body}
            </a>{" "}
            for body
          </p>
          <p className="mt-2 text-sm font-medium text-[var(--ink)]/65">
            {kit.fonts.why}
          </p>
          {kit.motion.length > 0 ? (
            <>
              <h3 className={heading + " mt-4"}>Motion rules</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-semibold text-[var(--ink)]/80">
                {kit.motion.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </div>

      <div className={card}>
        <h3 className={heading}>Plan per section</h3>
        <ol className="mt-3 space-y-3">
          {kit.sections.map((s) => (
            <li
              key={s.section}
              className="rounded-2xl border-[2px] border-[var(--ink)]/20 bg-[var(--bg)] p-4"
            >
              <p className="text-xs font-black uppercase tracking-wide text-[var(--ink)]/55">
                {s.section}
              </p>
              {s.remove ? (
                <p className="mt-1 text-sm font-semibold text-[var(--ink)]/70">
                  <span className="font-black text-[var(--accent-2)]">
                    Remove:
                  </span>{" "}
                  {s.remove}
                </p>
              ) : null}
              <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
                <span className="font-black">Replace with:</span> {s.replace}
              </p>
              {s.recipes.length > 0 ? (
                <p className="mt-2 flex flex-wrap gap-1.5">
                  {s.recipes.map((id) => (
                    <a
                      key={id}
                      href={"#recipe-" + id}
                      className="rounded-full border-[2px] border-[var(--ink)] bg-[var(--accent-3)] px-2 py-0.5 font-mono text-xs font-bold text-[var(--ink)]"
                    >
                      {id}
                    </a>
                  ))}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      {recipes.length > 0 ? (
        <div className="space-y-3">
          <h3 className={heading}>Recipes in this kit</h3>
          {recipes.map((r) => (
            <RecipeCard key={r.id} recipe={r} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const [open, setOpen] = useState(false);

  return (
    <article id={"recipe-" + recipe.id} className={card + " scroll-mt-6"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl">
          <p className="font-mono text-xs font-bold text-[var(--ink)]/50">
            {recipe.id}
          </p>
          <h4 className="font-[family-name:var(--font-display)] text-lg font-extrabold text-[var(--ink)]">
            {recipe.name}
          </h4>
          <p className="mt-1 text-sm font-semibold text-[var(--ink)]/75">
            {recipe.summary}
          </p>
          <p className="mt-2 text-xs font-bold text-[var(--ink)]/55">
            {recipe.support}{" "}
            <a
              href={"/recipes/" + recipe.id}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              Live demo ↗
            </a>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="squish-press rounded-full border-[3px] border-[var(--ink)] bg-white px-4 py-2 text-xs font-black text-[var(--ink)] shadow-[2px_2px_0_var(--ink)] transition"
        >
          {open ? "Hide code" : "Show code"}
        </button>
      </div>

      {open ? (
        <div className="motion-rise mt-4">
          <RecipeCode recipe={recipe} />
          <ul className="mt-3 space-y-1 text-xs font-semibold text-[var(--ink)]/65">
            {recipe.avoidWhen.map((a) => (
              <li key={a}>⚠️ {a}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}
