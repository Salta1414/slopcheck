"use client";

import { Show, SignInButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../convex/_generated/api";
import { button, card } from "@/components/home/ui";

/** The account side of /developers: status + links into Home. */
export function DeveloperAccountCard() {
  return (
    <div className={card}>
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--ink)]">
        0 · Get a key
      </h2>
      <Show when="signed-out">
        <p className="mt-2 text-sm font-semibold text-[var(--ink)]/70">
          Recipes are free without a key. Reviews need an account, an API key
          and credits (10 reviews for €29).
        </p>
        <SignInButton mode="modal">
          <button type="button" className={button + " mt-4 bg-[var(--accent)]"}>
            Log in to create a key
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <SignedInStatus />
      </Show>
    </div>
  );
}

function SignedInStatus() {
  const overview = useQuery(api.apiKeys.overview);
  const keys = overview?.keys.length ?? 0;
  const credits = overview?.credits ?? 0;

  return (
    <>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border-[2px] border-[var(--ink)]/15 bg-[var(--bg)] p-3">
          <dt className="text-xs font-black uppercase text-[var(--ink)]/50">
            API keys
          </dt>
          <dd className="font-[family-name:var(--font-display)] text-3xl font-black text-[var(--ink)]">
            {overview === undefined ? "–" : keys}
          </dd>
        </div>
        <div className="rounded-2xl border-[2px] border-[var(--ink)]/15 bg-[var(--bg)] p-3">
          <dt className="text-xs font-black uppercase text-[var(--ink)]/50">
            Credits
          </dt>
          <dd className="font-[family-name:var(--font-display)] text-3xl font-black text-[var(--ink)]">
            {overview === undefined ? "–" : credits}
          </dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/home/keys" className={button + " bg-[var(--accent)]"}>
          {keys === 0 ? "Create a key" : "Manage keys"}
        </Link>
        <Link href="/home/credits" className={button + " bg-white"}>
          Buy credits
        </Link>
      </div>
    </>
  );
}
