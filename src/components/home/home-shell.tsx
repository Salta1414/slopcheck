"use client";

import { Show, SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const TABS = [
  { href: "/home", label: "Scans" },
  { href: "/home/credits", label: "Credits" },
  { href: "/home/keys", label: "API keys" },
];

/** Account dashboard: one heading, three tabs, sign-in gate. */
export function HomeShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold text-[var(--ink)]">
        Home
      </h1>

      <Show when="signed-out">
        <div className="mt-6 rounded-[2rem] border-[3px] border-[var(--ink)] bg-white p-6 shadow-[4px_5px_0_var(--ink)]">
          <p className="font-semibold text-[var(--ink)]/70">
            Log in to see your scans, credits and API keys.
          </p>
          <SignInButton mode="modal">
            <button
              type="button"
              className="mt-4 rounded-full border-[3px] border-[var(--ink)] bg-[var(--accent)] px-5 py-2 text-sm font-black shadow-[3px_3px_0_var(--ink)] transition hover:translate-y-[1px] hover:shadow-[2px_2px_0_var(--ink)]"
            >
              Log in
            </button>
          </SignInButton>
        </div>
      </Show>

      <Show when="signed-in">
        <nav
          aria-label="Home sections"
          className="mt-6 flex w-full gap-1.5 overflow-x-auto rounded-full border-[3px] border-[var(--ink)] bg-white p-1.5 shadow-[3px_4px_0_var(--ink)] sm:w-max"
        >
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={
                  "flex-1 whitespace-nowrap rounded-full px-5 py-2 text-center text-sm font-black transition sm:flex-none " +
                  (active
                    ? "bg-[var(--accent)] text-[var(--ink)] shadow-[inset_0_0_0_2px_var(--ink)]"
                    : "text-[var(--ink)]/60 hover:bg-[var(--bg)] hover:text-[var(--ink)]")
                }
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <div key={pathname} className="motion-rise mt-8">
          {children}
        </div>
      </Show>
    </div>
  );
}
