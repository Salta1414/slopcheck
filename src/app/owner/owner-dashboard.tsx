"use client";

import { Show, SignInButton } from "@clerk/nextjs";
import { useAction, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { useEffect, useRef } from "react";
import { api } from "../../../convex/_generated/api";

type Verdict = "fresh" | "mixed" | "likely_slop" | "peak_slop";

type LiveRevenue = {
  currency: string;
  grossRevenueCents: number;
  refundedCents: number;
  netRevenueCents: number;
  grossLast30DaysCents: number;
  refundedLast30DaysCents: number;
  netLast30DaysCents: number;
  paidCount: number;
  refundCount: number;
  livemode: boolean;
  fetchedAt: number;
};

const dateTime = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});

const statusRows = [
  { key: "ready" as const, label: "Ready" },
  { key: "preevalReady" as const, label: "Preeval ready" },
  { key: "awaitingPayment" as const, label: "Awaiting payment" },
  { key: "fullReviewRunning" as const, label: "Full review running" },
  { key: "preevalRunning" as const, label: "Preeval running" },
  { key: "capturing" as const, label: "Capturing" },
  { key: "pendingCapture" as const, label: "Pending capture" },
  { key: "paid" as const, label: "Paid" },
  { key: "failed" as const, label: "Failed" },
];

const verdictRows: Array<{
  key: "fresh" | "mixed" | "likelySlop" | "peakSlop";
  label: string;
  verdict: Verdict;
}> = [
  { key: "fresh", label: "Fresh", verdict: "fresh" },
  { key: "mixed", label: "Mixed", verdict: "mixed" },
  { key: "likelySlop", label: "Likely slop", verdict: "likely_slop" },
  { key: "peakSlop", label: "Peak slop", verdict: "peak_slop" },
];

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatDate(timestamp: number): string {
  return dateTime.format(new Date(timestamp));
}

function verdictTone(verdict: Verdict | null): string {
  switch (verdict) {
    case "fresh":
      return "bg-[var(--accent)]";
    case "mixed":
      return "bg-[var(--accent-3)]";
    case "likely_slop":
      return "bg-[var(--accent-2)]/25";
    case "peak_slop":
      return "bg-[var(--accent-2)] text-white";
    default:
      return "bg-[var(--bg)]";
  }
}

export default function OwnerDashboard() {
  const [now] = useState(() => Date.now());

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Show when="signed-out">
        <div className="mx-auto max-w-xl rounded-[2rem] border-[3px] border-[var(--ink)] bg-white p-8 text-center shadow-[5px_6px_0_var(--ink)]">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--ink)]/45">
            Private area
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-black">
            Owner overview
          </h1>
          <p className="mt-3 font-semibold text-[var(--ink)]/65">
            Sign in with the owner account to see product stats.
          </p>
          <SignInButton mode="modal">
            <button
              type="button"
              className="mt-6 rounded-full border-[3px] border-[var(--ink)] bg-[var(--accent)] px-5 py-3 font-black shadow-[3px_3px_0_var(--ink)] transition hover:translate-y-[1px] hover:shadow-[2px_2px_0_var(--ink)]"
            >
              Sign in
            </button>
          </SignInButton>
        </div>
      </Show>

      <Show when="signed-in">
        <OwnerStats now={now} />
      </Show>
    </div>
  );
}

function OwnerStats({ now }: { now: number }) {
  const overview = useQuery(api.owner.overview, { now });
  const feedback = useQuery(
    api.feedback.listForOwner,
    overview ? { limit: 50 } : "skip",
  );
  const getLiveRevenue = useAction(api.stripeAnalytics.getLiveRevenue);
  const [liveRevenue, setLiveRevenue] = useState<
    LiveRevenue | null | undefined
  >(undefined);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const stripeRequestStarted = useRef(false);

  useEffect(() => {
    if (
      overview === undefined ||
      overview === null ||
      stripeRequestStarted.current
    ) {
      return;
    }

    stripeRequestStarted.current = true;
    void getLiveRevenue({ now })
      .then((revenue) => {
        setLiveRevenue(revenue);
        if (revenue === null) {
          setStripeError("Stripe revenue is not available for this account");
        }
      })
      .catch((error: unknown) => {
        setLiveRevenue(null);
        setStripeError(
          error instanceof Error
            ? error.message
            : "Could not load Stripe live revenue",
        );
      });
  }, [getLiveRevenue, now, overview]);

  if (overview === undefined) {
    return (
      <div className="rounded-[2rem] border-[3px] border-[var(--ink)] bg-white p-8 shadow-[5px_6px_0_var(--ink)]">
        <p className="animate-squish font-[family-name:var(--font-display)] text-2xl font-black">
          Loading the cockpit…
        </p>
      </div>
    );
  }

  if (overview === null) {
    return (
      <div className="mx-auto max-w-xl rounded-[2rem] border-[3px] border-[var(--ink)] bg-white p-8 text-center shadow-[5px_6px_0_var(--ink)]">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--accent-2)]">
          Access denied
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-black">
          Not your dashboard
        </h1>
        <p className="mt-3 font-semibold text-[var(--ink)]/65">
          This account is not configured as the Slopcheck owner.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full border-[3px] border-[var(--ink)] bg-[var(--accent)] px-5 py-3 font-black shadow-[3px_3px_0_var(--ink)] transition hover:translate-y-[1px] hover:shadow-[2px_2px_0_var(--ink)]"
        >
          Back home
        </Link>
      </div>
    );
  }

  const maxStatusCount = Math.max(
    1,
    ...Object.values(overview.scans.statuses),
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--ink)]/45">
            Private product cockpit
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl font-black tracking-tight text-[var(--ink)]">
            Owner overview
          </h1>
          <p className="mt-2 font-bold text-[var(--ink)]/60">
            {overview.ownerEmail}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-bold text-[var(--ink)]/45">
            Updated {formatDate(now)}
          </p>
          <Link
            href="/scans"
            className="rounded-full border-[3px] border-[var(--ink)] bg-white px-4 py-2 text-sm font-extrabold shadow-[3px_3px_0_var(--ink)] transition hover:translate-y-[1px] hover:shadow-[2px_2px_0_var(--ink)]"
          >
            Open scans →
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="All scans"
          value={overview.scans.total.toLocaleString("de-DE")}
          detail={`+${overview.scans.last7Days} in the last 7 days`}
          tone="mint"
        />
        <StatCard
          label="Users"
          value={overview.users.total.toLocaleString("de-DE")}
          detail={`+${overview.users.newLast30Days} in the last 30 days`}
          tone="yellow"
        />
        <StatCard
          label="Average slop score"
          value={overview.scans.averageScore?.toLocaleString("de-DE") ?? "—"}
          detail={`${overview.scans.scored} scored scans · higher = more slop`}
          tone="pink"
        />
        <StatCard
          label="Stripe revenue · live"
          value={
            liveRevenue
              ? formatMoney(
                  liveRevenue.netRevenueCents,
                  liveRevenue.currency,
                )
              : liveRevenue === undefined
                ? "…"
                : "—"
          }
          detail={
            stripeError
              ? stripeError
              : liveRevenue
                ? `Net · ${liveRevenue.paidCount} paid checkouts · ${formatMoney(liveRevenue.netLast30DaysCents, liveRevenue.currency)} in 30d`
                : "Loading live Stripe data…"
          }
          tone="white"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border-[3px] border-[var(--ink)] bg-white p-5 shadow-[5px_6px_0_var(--ink)] sm:p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--ink)]/45">
                Pipeline
              </p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-black">
                Scan status
              </h2>
            </div>
            <p className="text-right text-sm font-extrabold text-[var(--ink)]/55">
              {overview.scans.completed} ready
              <br />
              {overview.scans.inProgress} in progress
            </p>
          </div>
          <div className="mt-6 space-y-3">
            {statusRows.map((row) => {
              const count = overview.scans.statuses[row.key];
              return (
                <div key={row.key} className="grid grid-cols-[8.5rem_1fr_2.5rem] items-center gap-3">
                  <span className="truncate text-sm font-bold text-[var(--ink)]/65">
                    {row.label}
                  </span>
                  <div className="h-3 overflow-hidden rounded-full border-2 border-[var(--ink)] bg-[var(--bg)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-all"
                      style={{
                        width: `${Math.max(3, (count / maxStatusCount) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-right text-sm font-black">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[2rem] border-[3px] border-[var(--ink)] bg-white p-5 shadow-[5px_6px_0_var(--ink)] sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--ink)]/45">
            Quality signal
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-black">
            Verdict mix
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {verdictRows.map((row) => (
              <div
                key={row.key}
                className={`rounded-[1.25rem] border-[3px] border-[var(--ink)] p-4 ${verdictTone(row.verdict)}`}
              >
                <p className="text-sm font-black">{row.label}</p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-black">
                  {overview.scans.verdicts[row.key]}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-[var(--ink)]/60">
            <span>{overview.scans.failed} failed scans</span>
            <span>
              {liveRevenue
                ? `${liveRevenue.refundCount} Stripe refunds`
                : stripeError
                  ? "Stripe refunds unavailable"
                  : "Loading Stripe refunds…"}
            </span>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border-[3px] border-[var(--ink)] bg-white shadow-[5px_6px_0_var(--ink)]">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b-[3px] border-[var(--ink)] p-5 sm:p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--ink)]/45">
              Live inventory
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-black">
              Recent scans
            </h2>
          </div>
          <span className="rounded-full border-2 border-[var(--ink)] bg-[var(--accent-3)] px-3 py-1 text-xs font-black">
            Latest 8
          </span>
        </div>

        {overview.recentScans.length === 0 ? (
          <p className="p-6 font-bold text-[var(--ink)]/55">
            No scans have been created yet.
          </p>
        ) : (
          <ul className="divide-y-[3px] divide-[var(--ink)]">
            {overview.recentScans.map((scan) => (
              <li key={scan._id}>
                <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:px-6">
                  <div className="min-w-0">
                    <p className="truncate font-extrabold">{scan.url}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[var(--ink)]/45">
                      {scan.ownerEmail ?? "guest"} · {formatDate(scan.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`rounded-full border-2 border-[var(--ink)] px-3 py-1 text-xs font-black ${verdictTone(scan.verdict)}`}
                    >
                      {scan.verdict?.replace("_", " ") ?? scan.status}
                    </span>
                    <span className="min-w-10 text-right font-[family-name:var(--font-display)] text-3xl font-black">
                      {scan.score ?? "—"}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="overflow-hidden rounded-[2rem] border-[3px] border-[var(--ink)] bg-white shadow-[5px_6px_0_var(--ink)]">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b-[3px] border-[var(--ink)] p-5 sm:p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--ink)]/45">
              Customer voice
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-black">
              Feedback inbox
            </h2>
          </div>
          <span className="rounded-full border-2 border-[var(--ink)] bg-[var(--accent-3)] px-3 py-1 text-xs font-black">
            Latest {feedback?.length ?? "…"}
          </span>
        </div>

        {feedback === undefined ? (
          <p className="p-6 animate-squish font-bold text-[var(--ink)]/55">
            Loading feedback…
          </p>
        ) : feedback.length === 0 ? (
          <p className="p-6 font-bold text-[var(--ink)]/55">
            No feedback yet. Paid customers will appear here.
          </p>
        ) : (
          <ul className="divide-y-[3px] divide-[var(--ink)]">
            {feedback.map((item) => (
              <li key={item._id} className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-[family-name:var(--font-display)] text-2xl font-black">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[var(--ink)]/45">
                      {formatDate(item.createdAt)} ·{" "}
                      {item.scanId ? "attached to scan" : "general feedback"}
                    </p>
                  </div>
                  <span className="rounded-full border-2 border-[var(--ink)] bg-[var(--accent)] px-3 py-1 text-xs font-black">
                    Paid user
                  </span>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm font-semibold leading-6 text-[var(--ink)]/80">
                  {item.message}
                </p>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-[var(--ink)]/60">
                  {item.email ? (
                    <a
                      href={`mailto:${item.email}`}
                      className="underline decoration-2 underline-offset-2"
                    >
                      {item.email}
                    </a>
                  ) : null}
                  {item.twitter ? <span>X/Twitter: {item.twitter}</span> : null}
                  {!item.email && !item.twitter ? (
                    <span>User · {item.userId.slice(-8)}</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "mint" | "yellow" | "pink" | "white";
}) {
  const toneClass = {
    mint: "bg-[var(--accent)]",
    yellow: "bg-[var(--accent-3)]",
    pink: "bg-[var(--accent-2)]/25",
    white: "bg-white",
  }[tone];

  return (
    <div
      className={`rounded-[1.75rem] border-[3px] border-[var(--ink)] p-5 shadow-[4px_5px_0_var(--ink)] ${toneClass}`}
    >
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--ink)]/55">
        {label}
      </p>
      <p className="mt-3 break-words font-[family-name:var(--font-display)] text-4xl font-black tracking-tight">
        {value}
      </p>
      <p className="mt-2 text-sm font-bold text-[var(--ink)]/60">{detail}</p>
    </div>
  );
}
