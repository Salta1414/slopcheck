import Image from "next/image";
import Link from "next/link";
import { siteLegal } from "@/lib/site-legal";

const links = [
  { href: "/impressum", label: "Impressum" },
  { href: "/privacy", label: "Datenschutz" },
  { href: "/terms", label: "AGB" },
] as const;

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-auto border-t-[3px] border-[var(--ink)] bg-white/80">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <div className="flex items-center gap-2.5">
            <Image
              src="/brand/icon-192.png"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 rounded-[0.9rem] border-[3px] border-[var(--ink)] bg-white shadow-[3px_3px_0_var(--ink)]"
            />
            <p className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--ink)]">
              {siteLegal.productName}
            </p>
          </div>
          <p className="mt-2 max-w-sm text-sm font-semibold text-[var(--ink)]/60">
            Sniff AI slop. Fix it before your users do.
          </p>
          <p className="mt-3 text-xs font-bold text-[var(--ink)]/45">
            © {new Date().getFullYear()} {siteLegal.operator.name}
          </p>
        </div>

        <nav
          aria-label="Legal"
          className="flex flex-wrap gap-2 sm:justify-end"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border-[3px] border-[var(--ink)] bg-[var(--bg)] px-4 py-2 text-sm font-extrabold text-[var(--ink)] shadow-[3px_3px_0_var(--ink)] transition hover:translate-y-[1px] hover:bg-[var(--accent-3)] hover:shadow-[2px_2px_0_var(--ink)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
