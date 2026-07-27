import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm font-extrabold text-[var(--ink)]/60 transition hover:text-[var(--ink)]"
      >
        ← Back
      </Link>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-extrabold text-[var(--ink)] sm:text-5xl">
        {title}
      </h1>
      <p className="mt-2 text-sm font-bold text-[var(--ink)]/45">
        Stand: {updated}
      </p>
      <div className="legal-prose mt-8 space-y-6 text-[var(--ink)]/85">
        {children}
      </div>
    </article>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.5rem] border-[3px] border-[var(--ink)] bg-white p-5 shadow-[3px_4px_0_var(--ink)] sm:p-6">
      <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-[var(--ink)]">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm font-semibold leading-relaxed text-[var(--ink)]/75">
        {children}
      </div>
    </section>
  );
}
