"use client";

import { Show } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ScanReport } from "@/components/scan-report";
import { UnlockButton } from "@/components/unlock-button";

export default function ScanDetailClient() {
  const params = useParams<{ scanId: string }>();
  const searchParams = useSearchParams();
  const scanId = params.scanId as Id<"scans">;
  const paid = searchParams.get("paid") === "1";
  const canceled = searchParams.get("canceled") === "1";

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <Show when="signed-out">
        <div className="rounded-[2rem] border-[3px] border-[var(--ink)] bg-white p-8 shadow-[5px_6px_0_var(--ink)]">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold">
            Sign in to view this scan
          </h1>
          <p className="mt-2 font-semibold text-[var(--ink)]/70">
            Your report is tied to your account after checkout.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-full border-[3px] border-[var(--ink)] bg-[var(--accent)] px-5 py-2 text-sm font-black shadow-[3px_3px_0_var(--ink)]"
          >
            Back home
          </Link>
        </div>
      </Show>
      <Show when="signed-in">
        <ScanDetailBody
          scanId={scanId}
          paidBanner={paid}
          canceledBanner={canceled}
        />
      </Show>
    </div>
  );
}

function ScanDetailBody({
  scanId,
  paidBanner,
  canceledBanner,
}: {
  scanId: Id<"scans">;
  paidBanner: boolean;
  canceledBanner: boolean;
}) {
  const scan = useQuery(api.scans.getMine, { scanId });

  if (scan === undefined) {
    return (
      <p className="font-extrabold text-[var(--ink)]/60">Loading scan…</p>
    );
  }

  if (scan === null) {
    return (
      <div className="rounded-[2rem] border-[3px] border-[var(--ink)] bg-white p-8 shadow-[5px_6px_0_var(--ink)]">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold">
          Scan not found
        </h1>
        <Link href="/scans" className="mt-4 inline-block font-bold underline">
          Your scans
        </Link>
      </div>
    );
  }

  const canPay =
    scan.status === "preeval_ready" ||
    scan.status === "awaiting_payment" ||
    (scan.status === "failed" && !scan.review);

  const processing =
    scan.status === "paid" || scan.status === "full_review_running";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/scans"
            className="text-sm font-extrabold text-[var(--ink)]/55 hover:text-[var(--ink)]"
          >
            ← Your scans
          </Link>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--ink)] sm:text-4xl">
            Scan report
          </h1>
          <p className="mt-1 max-w-xl truncate text-sm font-semibold text-[var(--ink)]/65">
            {scan.normalizedUrl}
          </p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[var(--ink)]/45">
            status · {scan.status}
          </p>
        </div>
        {canPay ? <UnlockButton scanId={scan._id} /> : null}
      </div>

      {paidBanner && processing ? (
        <p className="rounded-2xl border-[3px] border-[var(--ink)] bg-[var(--accent)]/40 px-4 py-3 text-sm font-extrabold">
          Payment received — running the full UI review now…
        </p>
      ) : null}
      {canceledBanner ? (
        <p className="rounded-2xl border-[3px] border-[var(--ink)] bg-[var(--accent-2)]/20 px-4 py-3 text-sm font-extrabold">
          Checkout canceled — you can try again anytime.
        </p>
      ) : null}

      {scan.review ? (
        <ScanReport
          score={scan.review.score}
          summary={scan.review.summary}
          findings={scan.review.findings}
          prompts={scan.review.prompts}
        />
      ) : (
        <LockedTeaser
          estimatedScore={scan.estimatedScore}
          teaserFlags={scan.teaserFlags ?? []}
          lockedFindings={scan.lockedFindings ?? []}
          processing={processing}
          errorMessage={scan.errorMessage}
        />
      )}
    </div>
  );
}

function LockedTeaser({
  estimatedScore,
  teaserFlags,
  lockedFindings,
  processing,
  errorMessage,
}: {
  estimatedScore?: number;
  teaserFlags: string[];
  lockedFindings: string[];
  processing: boolean;
  errorMessage?: string;
}) {
  return (
    <div className="overflow-hidden rounded-[2rem] border-[3px] border-[var(--ink)] bg-white shadow-[6px_8px_0_var(--ink)]">
      <div className="border-b-[3px] border-[var(--ink)] p-6 sm:p-8">
        <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--ink)]/50">
          UI Slop Score · estimate
        </p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-6xl font-black">
          {estimatedScore ?? "—"}
        </p>
        {processing ? (
          <p className="mt-3 animate-squish text-sm font-extrabold text-[var(--ink)]/70">
            Strong model is reviewing…
          </p>
        ) : null}
        {errorMessage ? (
          <p className="mt-3 text-sm font-bold text-[var(--accent-2)]">
            {errorMessage}
          </p>
        ) : null}
      </div>
      <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
        <ul className="space-y-2">
          {teaserFlags.map((flag) => (
            <li
              key={flag}
              className="rounded-2xl border-[3px] border-[var(--ink)] bg-[var(--bg)] px-4 py-3 text-sm font-semibold"
            >
              {flag}
            </li>
          ))}
        </ul>
        <div className="relative space-y-2">
          {lockedFindings.map((f) => (
            <p
              key={f}
              className="rounded-2xl border-[3px] border-[var(--ink)]/30 bg-[var(--bg)] px-4 py-3 text-sm font-semibold blur-[6px] select-none"
            >
              {f}
            </p>
          ))}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white via-white/50 to-transparent" />
        </div>
      </div>
    </div>
  );
}
