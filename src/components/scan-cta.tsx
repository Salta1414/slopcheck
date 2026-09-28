import Link from "next/link";

export function ScanCta() {
  return (
    <div className="mt-14 rounded-[2rem] border-[3px] border-[var(--ink)] bg-[var(--accent)] p-8 shadow-[6px_8px_0_var(--ink)]">
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--ink)] sm:text-3xl">
        Which of these fit your site?
      </h2>
      <p className="mt-2 max-w-xl text-base font-bold text-[var(--ink)]/75">
        Scan your URL for free. The full review picks recipes for each section
        and hands your AI a complete design kit.
      </p>
      <Link
        href="/#site-url"
        className="mt-5 inline-flex min-h-12 items-center rounded-[1.2rem] border-[3px] border-[var(--ink)] bg-white px-6 text-base font-black shadow-[4px_4px_0_var(--ink)] transition hover:translate-y-[2px] hover:shadow-[2px_2px_0_var(--ink)]"
      >
        Check my site ↑
      </Link>
    </div>
  );
}
