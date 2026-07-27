"use client";

import { useState } from "react";

type Finding = {
  area: string;
  severity: "low" | "medium" | "high";
  issue: string;
  whyItFeelsAi: string;
  fixHint: string;
};

type PromptItem = {
  tool: string;
  title: string;
  prompt: string;
};

export function ScanReport({
  score,
  summary,
  findings,
  prompts,
}: {
  score: number;
  summary: string;
  findings: Finding[];
  prompts: PromptItem[];
}) {
  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border-[3px] border-[var(--ink)] bg-white p-6 shadow-[5px_6px_0_var(--ink)] sm:p-8">
        <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--ink)]/50">
          Full UI Slop Score
        </p>
        <div className="mt-2 flex items-end gap-3">
          <span className="font-[family-name:var(--font-display)] text-6xl font-black leading-none text-[var(--ink)]">
            {score}
          </span>
        </div>
        <p className="mt-4 text-base font-semibold text-[var(--ink)]/80">
          {summary}
        </p>
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--ink)]">
          Findings
        </h2>
        <ul className="mt-4 space-y-3">
          {findings.map((f) => (
            <li
              key={`${f.area}-${f.issue}`}
              className="rounded-[1.5rem] border-[3px] border-[var(--ink)] bg-white p-4 shadow-[3px_4px_0_var(--ink)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border-[2px] border-[var(--ink)] bg-[var(--accent-3)] px-2 py-0.5 text-xs font-extrabold uppercase">
                  {f.area}
                </span>
                <span className="rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] px-2 py-0.5 text-xs font-extrabold uppercase">
                  {f.severity}
                </span>
              </div>
              <p className="mt-2 text-sm font-extrabold text-[var(--ink)]">
                {f.issue}
              </p>
              <p className="mt-1 text-sm font-medium text-[var(--ink)]/70">
                {f.whyItFeelsAi}
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--ink)]">
                Fix: {f.fixHint}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--ink)]">
          Fix prompts
        </h2>
        <div className="mt-4 space-y-3">
          {prompts.map((p) => (
            <PromptCard key={`${p.tool}-${p.title}`} item={p} />
          ))}
        </div>
      </section>
    </div>
  );
}

function PromptCard({ item }: { item: PromptItem }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(item.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <article className="rounded-[1.5rem] border-[3px] border-[var(--ink)] bg-white p-4 shadow-[3px_4px_0_var(--ink)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--ink)]/50">
            {item.tool}
          </p>
          <h3 className="font-[family-name:var(--font-display)] text-lg font-extrabold text-[var(--ink)]">
            {item.title}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => void copy()}
          className="rounded-full border-[3px] border-[var(--ink)] bg-[var(--accent)] px-4 py-2 text-xs font-black text-[var(--ink)] shadow-[2px_2px_0_var(--ink)]"
        >
          {copied ? "Copied!" : "Copy prompt"}
        </button>
      </div>
      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-2xl border-[2px] border-[var(--ink)]/20 bg-[var(--bg)] p-3 text-xs font-semibold text-[var(--ink)]/80">
        {item.prompt}
      </pre>
    </article>
  );
}
