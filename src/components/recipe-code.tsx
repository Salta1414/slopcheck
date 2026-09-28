"use client";

import { useState } from "react";
import type { Recipe } from "../../convex/lib/recipes";

type Tab = "css" | "js" | "html" | "react";

/** Tabbed, copyable code for one recipe — used by the kit and the gallery. */
export function RecipeCode({ recipe }: { recipe: Recipe }) {
  const [tab, setTab] = useState<Tab>("css");
  const [copied, setCopied] = useState(false);
  const tabs: Tab[] = recipe.js
    ? ["css", "js", "html", "react"]
    : ["css", "html", "react"];
  const code = tab === "js" ? (recipe.js ?? "") : recipe[tab];

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-pressed={t === tab}
            className={
              "rounded-full border-[2px] border-[var(--ink)] px-3 py-1 text-xs font-black uppercase " +
              (t === tab ? "bg-[var(--accent)]" : "bg-white")
            }
          >
            {t}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void copy()}
          className="ml-auto rounded-full border-[2px] border-[var(--ink)] bg-[var(--accent-3)] px-3 py-1 text-xs font-black"
        >
          {copied ? "Copied ✓" : "Copy " + tab}
        </button>
      </div>
      <pre className="mt-3 max-h-[28rem] overflow-auto rounded-2xl border-[2px] border-[var(--ink)]/20 bg-[var(--bg)] p-3 text-xs font-semibold text-[var(--ink)]/85">
        {code}
      </pre>
    </div>
  );
}
