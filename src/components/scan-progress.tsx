"use client";

import { useEffect, useState } from "react";

const STEP_MS = 1900;

/**
 * Waiting panel for a running scan. Captures + AI take ~10–20s, so give the
 * visitor something to watch: rotating status lines, a crawling progress bar
 * and a mini browser being "scanned". Purely cosmetic — the lines are not
 * tied to real pipeline stages.
 */
export function ScanProgress({
  steps,
  title,
  durationMs = 18000,
}: {
  steps: string[];
  title: string;
  durationMs?: number;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => Math.min(i + 1, steps.length - 1));
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [steps.length]);

  return (
    <div className="motion-rise rounded-[2rem] border-[3px] border-[var(--ink)] bg-white p-6 shadow-[5px_6px_0_var(--ink)] sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <MiniBrowser />

        <div className="min-w-0 flex-1">
          <p className="font-[family-name:var(--font-display)] text-xl font-extrabold text-[var(--ink)] sm:text-2xl">
            {title}
          </p>
          <p
            key={index}
            aria-live="polite"
            className="motion-status mt-2 text-sm font-bold text-[var(--ink)]/65"
          >
            {steps[index]}
          </p>

          <div className="mt-5 h-5 overflow-hidden rounded-full border-[3px] border-[var(--ink)] bg-[var(--bg)]">
            <div
              className="motion-progress h-full w-full rounded-full bg-[var(--accent)]"
              style={{ ["--duration" as string]: `${durationMs}ms` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniBrowser() {
  return (
    <div
      aria-hidden
      className="relative mx-auto h-32 w-44 shrink-0 overflow-hidden rounded-[1.2rem] border-[3px] border-[var(--ink)] bg-[var(--bg)] shadow-[3px_4px_0_var(--ink)] sm:mx-0"
    >
      <div className="flex gap-1 border-b-[3px] border-[var(--ink)] bg-white px-2 py-1.5">
        <span className="h-2 w-2 rounded-full bg-[var(--accent-2)]" />
        <span className="h-2 w-2 rounded-full bg-[var(--accent-3)]" />
        <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
      </div>
      <div className="space-y-2 p-3">
        {[70, 95, 55, 80].map((width, i) => (
          <div
            key={width}
            className="motion-skeleton h-2.5 rounded-full bg-[var(--ink)]/25"
            style={{
              width: `${width}%`,
              ["--delay" as string]: `${i * 180}ms`,
            }}
          />
        ))}
      </div>
      <div className="motion-scan-line pointer-events-none absolute inset-x-0 top-0 h-[10%] border-y-[2px] border-[var(--ink)] bg-[var(--accent)]/60" />
      <span className="animate-blob-bounce absolute -bottom-1 right-1 text-3xl">
        🔍
      </span>
    </div>
  );
}
