/**
 * Blurred stand-ins for paywalled findings. The real text never reaches the
 * browser, so these are fixed dummy lines — only the count is real.
 */
const PLACEHOLDER_LINES = [
  "Hero headline could belong to any other SaaS in this space.",
  "Feature grid repeats the same card three times with new icons.",
  "Gradient and glow carry the brand instead of the product.",
  "Primary CTA copy is vague and easy to skip past.",
  "Typography scale is flat, so nothing leads the eye.",
  "Mobile nav collapses into a generic hamburger stack.",
];

export function LockedFindings({ count }: { count: number }) {
  const lines = PLACEHOLDER_LINES.slice(0, Math.max(1, Math.min(count, 6)));

  return (
    <div className="relative mt-3 space-y-2" aria-hidden>
      {lines.map((line) => (
        <p
          key={line}
          className="rounded-2xl border-[3px] border-[var(--ink)]/30 bg-[var(--bg)] px-4 py-3 text-sm font-semibold text-[var(--ink)] blur-[6px] select-none"
        >
          {line}
        </p>
      ))}
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-t from-white via-white/40 to-transparent" />
    </div>
  );
}
