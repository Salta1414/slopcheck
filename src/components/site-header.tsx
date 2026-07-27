"use client";

import {
  SignInButton,
  SignUpButton,
  Show,
  UserButton,
} from "@clerk/nextjs";
import Image from "next/image";

export function SiteHeader() {
  return (
    <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
      <a href="/" className="group flex items-center gap-2.5">
        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[1.1rem] border-[3px] border-[var(--ink)] bg-white shadow-[4px_4px_0_var(--ink)] transition-transform group-hover:translate-y-[1px] group-hover:shadow-[3px_3px_0_var(--ink)]">
          <Image
            src="/brand/icon-512.png"
            alt=""
            width={48}
            height={48}
            className="h-full w-full object-cover"
            priority
          />
        </span>
        <span className="font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight text-[var(--ink)]">
          Slopcheck
        </span>
      </a>

      <nav className="flex items-center gap-2 sm:gap-3">
        <Show when="signed-in">
          <a
            href="/scans"
            className="rounded-full border-[3px] border-[var(--ink)] bg-white px-4 py-2 text-sm font-extrabold text-[var(--ink)] shadow-[3px_3px_0_var(--ink)] transition hover:translate-y-[1px] hover:shadow-[2px_2px_0_var(--ink)]"
          >
            Scans
          </a>
        </Show>
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button
              type="button"
              className="rounded-full border-[3px] border-[var(--ink)] bg-white px-4 py-2 text-sm font-extrabold text-[var(--ink)] shadow-[3px_3px_0_var(--ink)] transition hover:translate-y-[1px] hover:shadow-[2px_2px_0_var(--ink)]"
            >
              Log in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button
              type="button"
              className="rounded-full border-[3px] border-[var(--ink)] bg-[var(--accent-2)] px-4 py-2 text-sm font-extrabold text-white shadow-[3px_3px_0_var(--ink)] transition hover:translate-y-[1px] hover:shadow-[2px_2px_0_var(--ink)]"
            >
              Sign up
            </button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </nav>
    </header>
  );
}
