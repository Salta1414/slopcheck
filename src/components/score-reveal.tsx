"use client";

import { useEffect, useState } from "react";
import type { SlopVerdict } from "@/lib/guest-storage";

/** How long the number counts up; the stamp and teaser cards key off this. */
export const COUNT_UP_MS = 1100;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Counts from 0 to `target` with an ease-out; static when `animate` is off. */
export function useCountUp(target: number, animate: boolean): number {
  const [value, setValue] = useState(() =>
    animate && !prefersReducedMotion() ? 0 : target,
  );

  useEffect(() => {
    if (!animate || prefersReducedMotion()) return;

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_UP_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, animate]);

  return value;
}

const VERDICT_STYLE: Record<
  SlopVerdict,
  { label: string; emoji: string; fill: string }
> = {
  fresh: { label: "Pretty fresh", emoji: "✨", fill: "var(--accent)" },
  mixed: { label: "Mixed vibes", emoji: "🤔", fill: "var(--accent-3)" },
  likely_slop: { label: "Likely slop", emoji: "🫠", fill: "#ff9aac" },
  peak_slop: { label: "Peak slop", emoji: "💀", fill: "var(--accent-2)" },
};

export function verdictStyle(verdict: SlopVerdict) {
  return VERDICT_STYLE[verdict];
}

/** Rubber stamp that slams onto the card once the count-up lands. */
export function VerdictStamp({
  verdict,
  animate,
}: {
  verdict: SlopVerdict;
  animate: boolean;
}) {
  const style = VERDICT_STYLE[verdict];
  return (
    <span
      className={`${animate ? "motion-stamp" : ""} inline-block rotate-[-6deg] rounded-xl border-[3px] border-[var(--ink)] px-3 py-1 font-[family-name:var(--font-display)] text-base font-black uppercase tracking-wide text-[var(--ink)] shadow-[3px_3px_0_var(--ink)]`}
      style={{
        background: style.fill,
        ["--delay" as string]: `${COUNT_UP_MS - 120}ms`,
      }}
    >
      {style.label} {style.emoji}
    </span>
  );
}

/** Comic thermometer: 0 = fresh on the left, 100 = peak slop on the right. */
export function ScoreMeter({
  score,
  verdict,
  animate,
}: {
  score: number;
  verdict: SlopVerdict;
  animate: boolean;
}) {
  return (
    <div className="mt-4 w-full max-w-sm" aria-hidden>
      <div className="h-5 overflow-hidden rounded-full border-[3px] border-[var(--ink)] bg-[var(--bg)]">
        <div
          className={`${animate ? "motion-swipe" : ""} h-full rounded-full border-r-[3px] border-[var(--ink)]`}
          style={{
            width: `${Math.max(4, score)}%`,
            background: VERDICT_STYLE[verdict].fill,
            animationDuration: `${COUNT_UP_MS}ms`,
            animationTimingFunction: "cubic-bezier(0.34, 1.3, 0.64, 1)",
          }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[11px] font-black uppercase tracking-wide text-[var(--ink)]/45">
        <span>fresh</span>
        <span>peak slop</span>
      </div>
    </div>
  );
}
