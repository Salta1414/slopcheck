"use client";

import { Show, SignUpButton } from "@clerk/nextjs";
import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useSyncExternalStore } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { LockedFindings } from "@/components/locked-findings";
import { ScanProgress } from "@/components/scan-progress";
import { ScanReport } from "@/components/scan-report";
import { ShareForFreeButton } from "@/components/share-for-free-button";
import { UnlockButton } from "@/components/unlock-button";
import { findGuestKeyForScan } from "@/lib/guest-storage";

// localStorage is read once per render; nothing needs to trigger re-reads.
const subscribeToNothing = () => () => {};

export default function ScanDetailClient() {
  const params = useParams<{ scanId: string }>();
  const searchParams = useSearchParams();
  const scanId = params.scanId as Id<"scans">;
  const paid = searchParams.get("paid") === "1";
  const canceled = searchParams.get("canceled") === "1";
  const keyFromLink = searchParams.get("k");
  // Guests reach their report via the private link from checkout, or via
  // the key this browser stored when it ran the scan.
  const storedKey = useSyncExternalStore(
    subscribeToNothing,
    () => findGuestKeyForScan(scanId),
    () => null,
  );
  const guestKey = keyFromLink ?? storedKey ?? undefined;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <ScanDetailBody
        scanId={scanId}
        guestKey={guestKey}
        paidBanner={paid}
        canceledBanner={canceled}
      />
    </div>
  );
}

function ScanDetailBody({
  scanId,
  guestKey,
  paidBanner,
  canceledBanner,
}: {
  scanId: Id<"scans">;
  guestKey?: string;
  paidBanner: boolean;
  canceledBanner: boolean;
}) {
  const { isLoading: authLoading } = useConvexAuth();
  const scan = useQuery(
    api.scans.getMine,
    authLoading ? "skip" : { scanId, guestKey },
  );

  if (authLoading || scan === undefined) {
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
        <p className="mt-2 font-semibold text-[var(--ink)]/70">
          Open the private report link from your checkout, or log in if you
          saved this scan to an account.
        </p>
        <Link href="/" className="mt-4 inline-block font-bold underline">
          Back home
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
            href={scan.isGuest ? "/" : "/scans"}
            className="text-sm font-extrabold text-[var(--ink)]/55 hover:text-[var(--ink)]"
          >
            {scan.isGuest ? "← Home" : "← Your scans"}
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
        {canPay ? <UnlockButton scanId={scan._id} guestKey={guestKey} /> : null}
      </div>

      {paidBanner && processing ? (
        <p className="rounded-2xl border-[3px] border-[var(--ink)] bg-[var(--accent)]/40 px-4 py-3 text-sm font-extrabold">
          Payment received — running the full UI review now…
        </p>
      ) : null}
      {scan.isGuest && (processing || scan.review) ? (
        <p className="rounded-2xl border-[3px] border-[var(--ink)] bg-[var(--accent-3)]/60 px-4 py-3 text-sm font-extrabold">
          Bookmark this page — the link is your private access to this report.{" "}
          <Show when="signed-out">
            <SignUpButton mode="modal">
              <button type="button" className="underline underline-offset-2">
                Or save it to a free account.
              </button>
            </SignUpButton>
          </Show>
        </p>
      ) : null}
      {canceledBanner ? (
        <p className="rounded-2xl border-[3px] border-[var(--ink)] bg-[var(--accent-2)]/20 px-4 py-3 text-sm font-extrabold">
          Checkout canceled — you can try again anytime.
        </p>
      ) : null}
      {processing && !scan.review ? (
        <ScanProgress
          title="Cooking your full review…"
          durationMs={60000}
          steps={[
            "Grabbing desktop and mobile screenshots…",
            "Reading your hero like a picky designer…",
            "Poking at the mobile nav…",
            "Judging your font pairing (lovingly)…",
            "Writing concrete findings…",
            "Drafting copy-paste fix prompts…",
            "Double-checking before we serve it…",
          ]}
        />
      ) : null}
      {scan.review ? (
        <ScanReport
          scanId={scan._id}
          guestKey={guestKey}
          score={scan.review.score}
          verdict={scan.verdict}
          url={scan.normalizedUrl}
          summary={scan.review.summary}
          findings={scan.review.findings}
          prompts={scan.review.prompts}
          tells={scan.review.tells}
          tellsChecked={scan.review.tellsChecked}
        />
      ) : (
        <LockedTeaser
          scanId={scan._id}
          estimatedScore={scan.estimatedScore}
          teaserFlags={scan.teaserFlags ?? []}
          lockedCount={scan.lockedCount}
          processing={processing}
          freeReviewClaimed={scan.freeReviewClaimed}
          errorMessage={scan.errorMessage}
        />
      )}
    </div>
  );
}

function LockedTeaser({
  scanId,
  estimatedScore,
  teaserFlags,
  lockedCount,
  processing,
  freeReviewClaimed,
  errorMessage,
}: {
  scanId: Id<"scans">;
  estimatedScore?: number;
  teaserFlags: string[];
  lockedCount: number;
  processing: boolean;
  freeReviewClaimed: boolean;
  errorMessage?: string;
}) {
  return (
    <div className="overflow-hidden rounded-[2rem] border-[3px] border-[var(--ink)] bg-white shadow-[6px_8px_0_var(--ink)]">
      <div className="flex flex-col gap-4 border-b-[3px] border-[var(--ink)] p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8">
        <div>
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
        {processing ? (
          <p className="max-w-sm rounded-[1.5rem] border-[3px] border-[var(--ink)] bg-[var(--accent)]/35 px-4 py-3 text-right text-sm font-black shadow-[3px_4px_0_var(--ink)]">
            Full analysis unlocked — cooking now…
          </p>
        ) : freeReviewClaimed ? (
          <p className="max-w-sm rounded-[1.5rem] border-[3px] border-[var(--ink)] bg-[var(--accent-2)]/15 px-4 py-3 text-right text-sm font-black shadow-[3px_4px_0_var(--ink)]">
            Free review was already claimed. You can retry the paid unlock above.
          </p>
        ) : estimatedScore !== undefined ? (
          <Show when="signed-in">
            <ShareForFreeButton scanId={scanId} />
          </Show>
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
        <div>
          <LockedFindings count={lockedCount} />
        </div>
      </div>
    </div>
  );
}
