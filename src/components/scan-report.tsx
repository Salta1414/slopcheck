"use client";

import { Show } from "@clerk/nextjs";
import { useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { FeedbackButton } from "@/components/feedback-button";
import { ShareScoreButton } from "@/components/share-score-button";
import type { SlopVerdict } from "@/lib/guest-storage";

type Finding = {
  area: string;
  severity: "low" | "medium" | "high";
  issue: string;
  whyItFeelsAi: string;
  fixHint: string;
};

type Tell = { id: string; label: string; evidence: string };

type PromptItem = {
  tool: string;
  title: string;
  prompt: string;
};

export function ScanReport({
  scanId,
  guestKey,
  score,
  verdict,
  url,
  summary,
  findings,
  prompts,
  tells,
  tellsChecked,
}: {
  scanId: Id<"scans">;
  guestKey?: string;
  score: number;
  verdict?: SlopVerdict;
  url: string;
  summary: string;
  findings: Finding[];
  prompts: PromptItem[];
  tells: Tell[];
  tellsChecked: number;
}) {
  return (
    <div className="space-y-8">
      <section className="motion-rise rounded-[2rem] border-[3px] border-[var(--ink)] bg-white p-6 shadow-[5px_6px_0_var(--ink)] sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--ink)]/50">
              Full UI Slop Score
            </p>
            <div className="mt-2 flex items-end gap-3">
              <span className="font-[family-name:var(--font-display)] text-6xl font-black leading-none text-[var(--ink)]">
                {score}
              </span>
            </div>
          </div>
          <ShareScoreButton
            scanId={scanId}
            guestKey={guestKey}
            score={score}
            verdict={verdict}
            url={url}
          />
        </div>
        <p className="mt-4 text-base font-semibold text-[var(--ink)]/80">
          {summary}
        </p>
        <Show when="signed-in">
          <FeedbackButton scanId={scanId} />
        </Show>
      </section>

      {tellsChecked > 0 ? (
        <section>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--ink)]">
            AI tells spotted · {tells.length}/{tellsChecked}
          </h2>
          {tells.length === 0 ? (
            <p className="mt-3 text-sm font-semibold text-[var(--ink)]/70">
              None of the classic template tells showed up. Nice.
            </p>
          ) : (
            <ul className="mt-4 flex flex-wrap gap-2">
              {tells.map((t, i) => (
                <li
                  key={t.id}
                  style={{ ["--delay" as string]: `${100 + i * 60}ms` }}
                  className="motion-pop rounded-2xl border-[3px] border-[var(--ink)] bg-[var(--accent-2)]/15 px-3 py-2 shadow-[2px_3px_0_var(--ink)]"
                >
                  <p className="text-sm font-black text-[var(--ink)]">
                    {t.label}
                  </p>
                  <p className="text-xs font-semibold text-[var(--ink)]/65">
                    {t.evidence}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--ink)]">
          Findings
        </h2>
        <ul className="mt-4 space-y-3">
          {findings.map((f, i) => (
            <li
              key={`${f.area}-${f.issue}`}
              style={{ ["--delay" as string]: `${150 + i * 80}ms` }}
              className="motion-rise rounded-[1.5rem] border-[3px] border-[var(--ink)] bg-white p-4 shadow-[3px_4px_0_var(--ink)]"
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
          {prompts.map((p, i) => (
            <PromptCard
              key={`${p.tool}-${p.title}`}
              item={p}
              delayMs={150 + (findings.length + i) * 80}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function PromptCard({ item, delayMs }: { item: PromptItem; delayMs: number }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(item.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <article
      className="motion-rise rounded-[1.5rem] border-[3px] border-[var(--ink)] bg-white p-4 shadow-[3px_4px_0_var(--ink)]"
      style={{ ["--delay" as string]: `${delayMs}ms` }}
    >
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
          className="squish-press rounded-full border-[3px] border-[var(--ink)] bg-[var(--accent)] px-4 py-2 text-xs font-black text-[var(--ink)] shadow-[2px_2px_0_var(--ink)] transition"
        >
          {copied ? (
            <span key="copied" className="motion-pop inline-block">
              Copied! ✓
            </span>
          ) : (
            "Copy prompt"
          )}
        </button>
      </div>
      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-2xl border-[2px] border-[var(--ink)]/20 bg-[var(--bg)] p-3 text-xs font-semibold text-[var(--ink)]/80">
        {item.prompt}
      </pre>
    </article>
  );
}
