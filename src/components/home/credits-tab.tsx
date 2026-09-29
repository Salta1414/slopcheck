"use client";

import { useAction, useQuery } from "convex/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { api } from "../../../convex/_generated/api";
import { button, card, formatDate, sectionLabel } from "./ui";

export function CreditsTab() {
  const overview = useQuery(api.apiKeys.overview);
  const buyCredits = useAction(api.payments.createCreditCheckout);
  const justPaid = useSearchParams().get("paid") === "1";
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onBuy() {
    setError(null);
    startTransition(async () => {
      try {
        const { url } = await buyCredits({});
        window.location.href = url;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start checkout");
      }
    });
  }

  if (overview === undefined) {
    return <div className={card + " motion-skeleton h-56"} aria-busy />;
  }

  return (
    <div className="space-y-6">
      {justPaid ? (
        <p className="motion-pop rounded-2xl border-[3px] border-[var(--ink)] bg-[var(--accent-3)] px-4 py-3 text-sm font-black text-[var(--ink)]">
          Payment received — your credits show up here within a few seconds.
        </p>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <section className={card}>
          <p className={sectionLabel}>Your balance</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-6xl font-black leading-none text-[var(--ink)]">
            {overview?.credits ?? 0}
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--ink)]/65">
            1 credit = 1 full review through the API or MCP server. Failed
            reviews give their credit back.
          </p>
        </section>

        <section className={card + " bg-[var(--accent)]/15"}>
          <p className={sectionLabel}>Credit pack</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-black text-[var(--ink)]">
            10 reviews · €29
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--ink)]/65">
            €2.90 per review instead of €5. One-time payment, credits don&apos;t
            expire.
          </p>
          <button
            type="button"
            onClick={onBuy}
            disabled={isPending}
            className={button + " mt-4 w-full bg-[var(--accent)]"}
          >
            {isPending ? "Opening checkout…" : "Buy 10 credits"}
          </button>
          {error ? (
            <p role="alert" className="mt-3 text-sm font-bold text-red-700">
              {error}
            </p>
          ) : null}
        </section>
      </div>

      <section className={card}>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-[var(--ink)]">
          Purchases
        </h2>
        {!overview || overview.purchases.length === 0 ? (
          <p className="mt-2 text-sm font-semibold text-[var(--ink)]/65">
            No purchases yet.
          </p>
        ) : (
          <ul className="mt-3 divide-y-[2px] divide-[var(--ink)]/10">
            {overview.purchases.map((p) => (
              <li
                key={p._id}
                className="flex items-center justify-between py-3 text-sm font-bold text-[var(--ink)]"
              >
                <span>+{p.credits} credits</span>
                <span className="text-[var(--ink)]/55">
                  {formatDate(p.paidAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-sm font-semibold text-[var(--ink)]/65">
          Reviews you run with credits appear under{" "}
          <Link href="/home" className="font-black underline">
            Scans
          </Link>{" "}
          with an API tag.
        </p>
      </section>
    </div>
  );
}
