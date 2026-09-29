export const card =
  "rounded-[1.8rem] border-[3px] border-[var(--ink)] bg-white p-6 shadow-[5px_6px_0_var(--ink)]";

export const button =
  "inline-flex min-h-11 items-center justify-center rounded-[1.1rem] border-[3px] border-[var(--ink)] px-5 text-sm font-black text-[var(--ink)] shadow-[3px_3px_0_var(--ink)] transition enabled:hover:translate-y-[1px] enabled:hover:shadow-[2px_2px_0_var(--ink)] disabled:opacity-60";

export const sectionLabel =
  "text-xs font-black uppercase tracking-wide text-[var(--ink)]/50";

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
